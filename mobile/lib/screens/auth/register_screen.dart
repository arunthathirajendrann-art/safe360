import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../home/home_screen.dart';

class RegisterScreen extends StatefulWidget {
  final String initialUserType;
  const RegisterScreen({super.key, this.initialUserType = 'STANDARD'});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int _currentStep = 0;
  final _formKey = GlobalKey<FormState>();

  // Form Controllers
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Contact Controllers
  final _contactNameController = TextEditingController();
  final _contactPhoneController = TextEditingController();
  String _relationship = 'Parent / Guardian';

  late String _userType;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _userType = widget.initialUserType;
  }

  Future<void> _handleCompleteRegistration() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final auth = AuthService();
      await auth.register(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
        userType: _userType,
      );

      // Optionally add primary contact if filled
      if (_contactNameController.text.trim().isNotEmpty && _contactPhoneController.text.trim().isNotEmpty) {
        await auth.addContact(
          name: _contactNameController.text.trim(),
          phone: _contactPhoneController.text.trim(),
          relationship: _relationship,
          tier: 'PRIMARY',
        );
      }

      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Step ${_currentStep + 1} of 4',
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Step Indicator Bar
                Row(
                  children: List.generate(
                    4,
                    (idx) => Expanded(
                      child: Container(
                        height: 4,
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: idx <= _currentStep ? const Color(0xFF6366F1) : const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.4)),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],

                // STEP 1: Personal Profile
                if (_currentStep == 0) ...[
                  const Text('Let\'s protect you.', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Enter your personal information to set up your identity.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                  const SizedBox(height: 28),

                  TextFormField(
                    controller: _nameController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Full Name',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF818CF8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Enter your full name' : null,
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Phone Number (E.164)',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.phone_outlined, color: Color(0xFF818CF8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Enter your phone number' : null,
                  ),
                ],

                // STEP 2: Account Security
                if (_currentStep == 1) ...[
                  const Text('Secure your account.', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Create credentials to log into your Safe360 network.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                  const SizedBox(height: 28),

                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Email Address',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF818CF8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Enter your email address' : null,
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF818CF8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    validator: (v) => v == null || v.length < 6 ? 'Password must be at least 6 characters' : null,
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Confirm Password',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.lock_clock_outlined, color: Color(0xFF818CF8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    validator: (v) => v != _passwordController.text ? 'Passwords do not match' : null,
                  ),
                ],

                // STEP 3: Safety Circle Contacts
                if (_currentStep == 2) ...[
                  const Text('Build your Safety Circle.', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Add your Primary Emergency Contact (e.g. Parent, Guardian, Child).', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                  const SizedBox(height: 28),

                  TextFormField(
                    controller: _contactNameController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Primary Contact Name',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.contacts_outlined, color: Color(0xFF818CF8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    controller: _contactPhoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Primary Phone Number',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.phone, color: Color(0xFF818CF8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                ],

                // STEP 4: Protection Status Confirmation
                if (_currentStep == 3) ...[
                  Center(
                    child: Column(
                      children: [
                        const SizedBox(height: 24),
                        Container(
                          width: 90,
                          height: 90,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF10B981).withOpacity(0.2),
                            border: Border.all(color: const Color(0xFF10B981), width: 2),
                          ),
                          child: const Icon(Icons.check_circle_outline, size: 50, color: Color(0xFF10B981)),
                        ),
                        const SizedBox(height: 24),
                        const Text('You\'re Protected!', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 12),
                        const Text(
                          'Your Safe360 safety network and emergency contact circle are configured and active.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 15, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 36),

                // Step Action Buttons
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _isLoading
                        ? null
                        : () {
                            if (_currentStep < 3) {
                              if (_formKey.currentState!.validate()) {
                                setState(() {
                                  _currentStep++;
                                });
                              }
                            } else {
                              _handleCompleteRegistration();
                            }
                          },
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                        : Text(
                            _currentStep == 3 ? 'Enter Safe360' : 'Continue',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
