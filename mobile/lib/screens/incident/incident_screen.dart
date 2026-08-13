import 'package:flutter/material.dart';

class IncidentScreen extends StatelessWidget {
  final double latitude;
  final double longitude;
  final Map<String, dynamic>? incidentData;

  const IncidentScreen({
    super.key,
    required this.latitude,
    required this.longitude,
    this.incidentData,
  });

  @override
  Widget build(BuildContext context) {
    // Extract backend properties safely from response payload
    final Map<String, dynamic>? incidentMap =
        incidentData?['incident'] as Map<String, dynamic>?;
    final Map<String, dynamic>? responderMap =
        incidentData?['responder'] as Map<String, dynamic>?;
    final Map<String, dynamic>? assessmentMap =
        incidentData?['assessment'] as Map<String, dynamic>?;

    final String incidentId = incidentMap?['_id'] ?? incidentMap?['id'] ?? 'INC-MOBILE';
    final String incidentType = incidentMap?['type'] ?? 'SOS';
    final String status = incidentMap?['status'] ?? 'RESPONDER_ASSIGNED';
    final String priority = incidentMap?['priority'] ?? assessmentMap?['priority'] ?? 'HIGH';
    final String contextSummary = assessmentMap?['summary'] ?? incidentMap?['context'] ?? 'Manual SOS activated';

    final String responderName = responderMap != null
        ? '${responderMap['name']} (${responderMap['id']})'
        : (incidentMap?['currentResponder'] != null
            ? 'Responder ${incidentMap!['currentResponder']}'
            : 'Waiting for acknowledgement');

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Incident Details',
          style: TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Active incident header
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: Colors.red.shade100,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: Colors.red.shade100,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.warning_rounded,
                            color: Colors.red.shade600,
                            size: 32,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'ACTIVE INCIDENT',
                                style: TextStyle(
                                  color: Colors.red,
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.1,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$incidentType Emergency',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'ID: $incidentId',
                                style: const TextStyle(
                                  color: Colors.black54,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Current status
                  _InfoCard(
                    title: 'Current Status',
                    icon: Icons.shield,
                    iconColor: status == 'RESOLVED' ? Colors.green : Colors.orange,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              status,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: priority == 'CRITICAL'
                                    ? Colors.red.shade100
                                    : Colors.amber.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                priority,
                                style: TextStyle(
                                  color: priority == 'CRITICAL'
                                      ? Colors.red.shade900
                                      : Colors.amber.shade900,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Backend orchestration active',
                          style: TextStyle(
                            color: Colors.black54,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Location
                  _InfoCard(
                    title: 'Location',
                    icon: Icons.location_on_outlined,
                    iconColor: Colors.red,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Current location',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Latitude: ${latitude.toStringAsFixed(6)}',
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Longitude: ${longitude.toStringAsFixed(6)}',
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Detection / LLM Assessment
                  _InfoCard(
                    title: 'Detection & AI Assessment',
                    icon: Icons.psychology_outlined,
                    iconColor: Colors.purple,
                    child: Text(
                      contextSummary,
                      style: const TextStyle(
                        fontSize: 16,
                        height: 1.4,
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Responder
                  _InfoCard(
                    title: 'Assigned Responder',
                    icon: Icons.people_outline,
                    iconColor: Colors.blue,
                    child: Text(
                      responderName,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Timeline
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Incident Timeline',
                          style: TextStyle(
                            color: Colors.black54,
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 22),

                        _TimelineItem(
                          icon: Icons.warning_amber_rounded,
                          iconColor: Colors.red,
                          title: 'Incident Created & Assessed',
                          subtitle: 'Status: $status ($priority)',
                          isLast: false,
                        ),

                        _TimelineItem(
                          icon: Icons.notifications_none,
                          iconColor: Colors.orange,
                          title: 'Responder Dispatched',
                          subtitle: responderName,
                          isLast: false,
                        ),

                        _TimelineItem(
                          icon: Icons.location_on_outlined,
                          iconColor: Colors.blue,
                          title: 'Location Captured',
                          subtitle: '${latitude.toStringAsFixed(4)}, ${longitude.toStringAsFixed(4)}',
                          isLast: true,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),
                ],
              ),
            ),

            // Return to safety
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: SizedBox(
                width: double.infinity,
                height: 58,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.popUntil(
                      context,
                      (route) => route.isFirst,
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: const BorderSide(
                      color: Colors.black26,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'RETURN TO SAFETY',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;

  const _InfoCard({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.black54,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                icon,
                color: iconColor,
                size: 24,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: child,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool isLast;

  const _TimelineItem({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 36,
          child: Column(
            children: [
              Icon(
                icon,
                color: iconColor,
                size: 28,
              ),
              if (!isLast)
                Container(
                  width: 2,
                  height: 52,
                  color: Colors.black12,
                ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Colors.black54,
                    fontSize: 14,
                  ),
                ),
                if (!isLast) const SizedBox(height: 22),
              ],
            ),
          ),
        ),
      ],
    );
  }
}