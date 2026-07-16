import 'package:flutter/material.dart';

class StoreDashboardScreen extends StatelessWidget {
  const StoreDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(child: _buildStatCard('Today Sales', '\$450.00', Colors.blue)),
            const SizedBox(width: 16),
            Expanded(child: _buildStatCard('Monthly', '\$12,500', Colors.green)),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildStatCard('Debts', '\$1,200.00', Colors.red)),
            const SizedBox(width: 16),
            Expanded(child: _buildStatCard('Inventory', 'Good', Colors.orange)),
          ],
        ),
        const SizedBox(height: 24),
        const Text('Recent Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const Card(
          child: ListTile(
            leading: Icon(Icons.receipt, color: Colors.blue),
            title: Text('Sale #1004'),
            subtitle: Text('Cash payment'),
            trailing: Text('\$45.00', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        )
      ],
    );
  }

  Widget _buildStatCard(String title, String value, Color color) {
    return Card(
      color: color.withOpacity(0.1),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withOpacity(0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
