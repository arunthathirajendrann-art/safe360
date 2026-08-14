import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../services/auth_service.dart';
import '../../services/api/api_service.dart';
import '../onboarding/onboarding_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isEmergencyActive = false;
  bool _isSendingSos = false;
  String? _activeIncidentId;
  String _activePriority = 'HIGH';
  String _activeStatus = 'DETECTED';
  String? _activeSummary;

  final TextEditingController _contactNameController = TextEditingController();
  final TextEditingController _contactPhoneController = TextEditingController();
  String _selectedTier = 'PRIMARY';

  @override
  void initState() {
    super.initState();
    final auth = AuthService();
    auth.fetchContacts();
  }

  Future<Position?> _getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    } catch (e) {
      return null;
    }
  }

  Future<void> _triggerSos(String type) async {
    setState(() {
      _isSendingSos = true;
    });

    final auth = AuthService();
    final pos = await _getCurrentLocation();
    final lat = pos?.latitude ?? 37.7749;
    final lng = pos?.longitude ?? -122.4194;

    try {
      final res = await ApiService.createIncident(
        type: type,
        latitude: lat,
        longitude: lng,
        userId: auth.user?['userId'] ?? 'USR-MOBILE-01',
        token: auth.token,
        context: type == 'VOICE' ? 'Voice emergency signal triggered' : 'SOS Emergency button pressed',
      );

      final incident = res['incident'];
      final assessment = res['assessment'];

      setState(() {
        _isEmergencyActive = true;
        _isSendingSos = false;
        _activeIncidentId = incident['_id'] ?? incident['id'];
        _activePriority = incident['priority'] ?? assessment['priority'] ?? 'HIGH';
        _activeStatus = incident['status'] ?? 'UNDERSTOOD';
        _activeSummary = assessment?['summary'] ?? 'Emergency incident in progress.';
      });

    } catch (e) {
      setState(() {
        _isSendingSos = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Emergency Alert Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _showAddContactDialog() async {
    return showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text('Add Emergency Contact', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _contactNameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Name', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _contactPhoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Phone Number', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _selectedTier,
                dropdownColor: const Color(0xFF1E293B),
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Escalation Tier', labelStyle: TextStyle(color: Color(0xFF94A3B8))),
                items: const [
                  DropdownMenuItem(value: 'PRIMARY', child: Text('PRIMARY (1st Contact)')),
                  DropdownMenuItem(value: 'SECONDARY', child: Text('SECONDARY (2nd Contact)')),
                  DropdownMenuItem(value: 'TERTIARY', child: Text('TERTIARY (3rd Contact)')),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedTier = val);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
              onPressed: () async {
                final auth = AuthService();
                if (_contactNameController.text.isNotEmpty && _contactPhoneController.text.isNotEmpty) {
                  await auth.addContact(
                    name: _contactNameController.text.trim(),
                    phone: _contactPhoneController.text.trim(),
                    tier: _selectedTier,
                  );
                  _contactNameController.clear();
                  _contactPhoneController.clear();
                  if (mounted) Navigator.pop(ctx);
                }
              },
              child: const Text('Add Contact', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthService();
    final userMode = auth.userMode;
    final userName = auth.user?['name'] ?? 'User';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shield, color: Color(0xFF818CF8), size: 20),
            ),
            const SizedBox(width: 10),
            Text(
              userMode == 'ELDER' ? 'SAFE360 ELDER' : 'SAFE360 OS',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              userMode == 'ELDER' ? Icons.accessibility_new : Icons.switch_account,
              color: const Color(0xFF818CF8),
            ),
            onPressed: () {
              final nextMode = userMode == 'STANDARD' ? 'ELDER' : (userMode == 'ELDER' ? 'CAREGIVER' : 'STANDARD');
              auth.setUserMode(nextMode);
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF94A3B8)),
            onPressed: () {
              auth.logout();
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                (route) => false,
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // MODE 1: ELDERLY USER EXPERIENCE
              if (userMode == 'ELDER') ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'HELLO, ${userName.toUpperCase()}',
                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'YOUR SAFETY CIRCLE IS ACTIVE',
                            style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Giant Red SOS Button for Elders
                Center(
                  child: GestureDetector(
                    onTap: _isSendingSos ? null : () => _triggerSos('SOS'),
                    child: Container(
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFEF4444).withOpacity(0.5),
                            blurRadius: 36,
                            spreadRadius: 10,
                          )
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.touch_app, size: 60, color: Colors.white),
                          const SizedBox(height: 8),
                          Text(
                            _isSendingSos ? 'SENDING...' : 'I NEED HELP',
                            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                          ),
                          const Text('PRESS FOR EMERGENCY', style: TextStyle(color: Colors.white70, fontSize: 11)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 36),

                const Text(
                  'YOUR EMERGENCY CONTACTS',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                ),
                const SizedBox(height: 12),

                // Contacts list for Elders
                if (auth.contacts.isEmpty)
                  const Text('No contacts added yet. Tap + to add.', style: TextStyle(color: Colors.white70))
                else
                  ...auth.contacts.map(
                    (c) => Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.person, color: Color(0xFF818CF8), size: 30),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                Text('${c['tier']} — ${c['phone']}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ]

              // MODE 2: CAREGIVER / GUARDIAN MODE
              else if (userMode == 'CAREGIVER') ...[
                const Text('CAREGIVER SAFETY COMMAND', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                const Text('Monitor connected family members and manage emergency responses.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                const SizedBox(height: 24),

                const Text('CONNECTED PROTECTED PEOPLE', style: TextStyle(color: Color(0xFF818CF8), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                const SizedBox(height: 12),

                if (auth.connectedPeople.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Text('No connected protected people linked yet.', style: TextStyle(color: Color(0xFF94A3B8))),
                  )
                else
                  ...auth.connectedPeople.map((cp) {
                    final person = cp['protectedPerson'] ?? {};
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          const Icon(Icons.nature_people, color: Color(0xFF10B981), size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(person['name'] ?? 'Protected Person', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                                Text('Relationship: ${cp['relationship']} (${cp['tier']})', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.2), borderRadius: BorderRadius.circular(6)),
                            child: const Text('SAFE', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 11)),
                          ),
                        ],
                      ),
                    );
                  }),
                const SizedBox(height: 24),

                const Text('AUTHORIZED EMERGENCY ALERTS', style: TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                const SizedBox(height: 12),

                if (auth.guardianIncidents.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Text('No active emergency incidents for connected family members.', style: TextStyle(color: Color(0xFF94A3B8))),
                  )
                else
                  ...auth.guardianIncidents.map((inc) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7F1D1D).withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFEF4444)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('INCIDENT: ${inc['type']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                                child: Text(inc['priority'] ?? 'HIGH', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('Subject ID: ${inc['userId']}', style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12)),
                          Text('Status: ${inc['status']}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                              icon: const Icon(Icons.check_circle, color: Colors.white, size: 18),
                              label: const Text('ACKNOWLEDGE EMERGENCY', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              onPressed: () async {
                                final id = inc['_id'] ?? inc['id'];
                                await ApiService.acknowledgeIncident(id, auth.token!);
                                await auth.fetchContacts();
                              },
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
              ]

              // MODE 3: STANDARD MODE (PERSONAL SAFETY OS)
              else ...[
                // Banner Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.verified_user, color: Color(0xFF10B981)),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('You\'re protected, $userName', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                            const Text('Safety Circle Active • GPS Locked • AI Armed', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Main Glowing SOS Control Button
                Center(
                  child: GestureDetector(
                    onTap: _isSendingSos ? null : () => _triggerSos('SOS'),
                    child: Container(
                      width: 170,
                      height: 170,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF6366F1).withOpacity(0.4),
                            blurRadius: 30,
                            spreadRadius: 6,
                          )
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.emergency, size: 50, color: Colors.white),
                          const SizedBox(height: 6),
                          Text(
                            _isSendingSos ? 'SENDING...' : 'TRIGGER SOS',
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Active Emergency Alert Card (If Triggered)
                if (_isEmergencyActive) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7F1D1D).withOpacity(0.3),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('EMERGENCY ACTIVE', style: TextStyle(color: Color(0xFFFCA5A5), fontWeight: FontWeight.bold, fontSize: 14)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                              child: Text(_activePriority, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('Status: $_activeStatus', style: const TextStyle(color: Colors.white, fontSize: 13)),
                        if (_activeSummary != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text('AI Assessment: $_activeSummary', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                ],

                // Action Options Grid
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 14)),
                        icon: const Icon(Icons.mic, color: Color(0xFFEC4899), size: 20),
                        label: const Text('Voice SOS', style: TextStyle(color: Colors.white, fontSize: 13)),
                        onPressed: () => _triggerSos('VOICE'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 14)),
                        icon: const Icon(Icons.person_add, color: Color(0xFF818CF8), size: 20),
                        label: const Text('Add Contact', style: TextStyle(color: Colors.white, fontSize: 13)),
                        onPressed: _showAddContactDialog,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Safety Circle Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('YOUR SAFETY CIRCLE', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                    Text('${auth.contacts.length} Contacts', style: const TextStyle(color: Color(0xFF818CF8), fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 12),

                if (auth.contacts.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                    child: const Text('No emergency contacts linked yet. Tap Add Contact to build your safety circle.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                  )
                else
                  ...auth.contacts.map(
                    (c) => Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: const Color(0xFF6366F1).withOpacity(0.15), shape: BoxShape.circle),
                            child: const Icon(Icons.person, color: Color(0xFF818CF8), size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                Text('${c['relationship'] ?? "Contact"} • ${c['phone']}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: c['status'] == 'ACCEPTED' ? const Color(0xFF10B981).withOpacity(0.2) : const Color(0xFFF59E0B).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${c['tier']} (${c['status'] ?? 'PENDING'})',
                              style: TextStyle(
                                color: c['status'] == 'ACCEPTED' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}