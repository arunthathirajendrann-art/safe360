import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  String _selectedMode = 'STANDARD'; // 'STANDARD' or 'ELDER'

  final List<Map<String, dynamic>> _slides = [
    {
      'title': 'SAFE360',
      'subtitle': 'Your Intelligent Emergency Safety Network',
      'description': 'Continuous protection connecting you, your trusted safety circle, AI situational intelligence, and tactical emergency responders.',
      'icon': Icons.shield_outlined,
      'color': Color(0xFF6366F1),
    },
    {
      'title': 'DETECT',
      'subtitle': 'Multi-Modal Signal Ingestion',
      'description': 'Captures instant SOS signals, voice triggers, route anomalies, and physical sensor telemetry to initiate instant response.',
      'icon': Icons.sensors,
      'color': Color(0xFFEC4899),
    },
    {
      'title': 'UNDERSTAND',
      'subtitle': 'AI Contextual Risk Analysis',
      'description': 'Google Gemini AI evaluates ambient audio, telemetry evidence, and location context to classify situation severity (HIGH / CRITICAL).',
      'icon': Icons.psychology,
      'color': Color(0xFF8B5CF6),
    },
    {
      'title': 'ESCALATE',
      'subtitle': 'Deterministic Multi-Tier Contact Chain',
      'description': 'Primary Contact → Secondary Contact → Tertiary Contact → Emergency Responder Fleet. Governed strictly by transparent safety rules.',
      'icon': Icons.account_tree_outlined,
      'color': Color(0xFFF59E0B),
    },
    {
      'title': 'SEE WHY',
      'subtitle': 'Explainable Audit Timeline',
      'description': 'Every single detection step, AI classification, call attempt, and escalation event is recorded with human-readable timestamps.',
      'icon': Icons.history_edu,
      'color': Color(0xFF10B981),
    },
    {
      'title': 'CONNECT CIRCLE',
      'subtitle': 'Protect Your Family Across Generations',
      'description': 'Add trusted parents, children, or caregivers. Choose Standard Mode for yourself or Elder Mode for family members needing simple, large controls.',
      'icon': Icons.people_alt_outlined,
      'color': Color(0xFF3B82F6),
    },
  ];

  @override
  Widget build(BuildContext meContext) {
    final auth = AuthService();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            // Top Navigation & Skip
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.security, color: Color(0xFF818CF8), size: 20),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'SAFE360',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: () {
                      _pageController.animateToPage(
                        5,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                    child: const Text(
                      'Skip to Mode',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

            // Page View Carousel
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemCount: _slides.length,
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Animated Hero Icon Card
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: (slide['color'] as Color).withOpacity(0.15),
                            border: Border.all(
                              color: (slide['color'] as Color).withOpacity(0.4),
                              width: 2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: (slide['color'] as Color).withOpacity(0.25),
                                blurRadius: 30,
                                spreadRadius: 5,
                              )
                            ],
                          ),
                          child: Icon(
                            slide['icon'] as IconData,
                            size: 56,
                            color: slide['color'] as Color,
                          ),
                        ),
                        const SizedBox(height: 36),

                        // Title & Subtitle
                        Text(
                          slide['title'] as String,
                          style: TextStyle(
                            color: slide['color'] as Color,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2.0,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          slide['subtitle'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Description Payload
                        Text(
                          slide['description'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),

                        // If last page, show Mode Selection UI
                        if (index == 5) ...[
                          const SizedBox(height: 28),
                          const Text(
                            'Who is Safe360 protecting?',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: ChoiceChip(
                                  label: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 8),
                                    child: Text('Myself\n(Standard Mode)', textAlign: TextAlign.center),
                                  ),
                                  selected: _selectedMode == 'STANDARD',
                                  selectedColor: const Color(0xFF6366F1),
                                  backgroundColor: const Color(0xFF1E293B),
                                  labelStyle: const TextStyle(color: Colors.white, fontSize: 12),
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() {
                                        _selectedMode = 'STANDARD';
                                        auth.setUserMode('STANDARD');
                                      });
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ChoiceChip(
                                  label: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 8),
                                    child: Text('Elderly Family\n(Elder Mode)', textAlign: TextAlign.center),
                                  ),
                                  selected: _selectedMode == 'ELDER',
                                  selectedColor: const Color(0xFFEC4899),
                                  backgroundColor: const Color(0xFF1E293B),
                                  labelStyle: const TextStyle(color: Colors.white, fontSize: 12),
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() {
                                        _selectedMode = 'ELDER';
                                        auth.setUserMode('ELDER');
                                      });
                                    }
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),

            // Page Indicator Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _slides.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == index ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(4),
                    color: _currentPage == index
                        ? (_slides[_currentPage]['color'] as Color)
                        : const Color(0xFF334155),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),

            // Bottom CTA Controls
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 4,
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => RegisterScreen(initialUserType: _selectedMode),
                          ),
                        );
                      },
                      child: const Text(
                        'Create Safe360 Account',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Color(0xFF334155)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                        );
                      },
                      child: const Text('Login to Existing Account'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
