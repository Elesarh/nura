import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import 'store_dashboard.dart';
import 'products_screen.dart';
// import 'customers_screen.dart';
// import 'sales_screen.dart';

class StoreLayout extends StatefulWidget {
  const StoreLayout({super.key});

  @override
  State<StoreLayout> createState() => _StoreLayoutState();
}

class _StoreLayoutState extends State<StoreLayout> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const StoreDashboardScreen(),
    const ProductsScreen(),
    const Center(child: Text('Customers Screen')), // Placeholder
    const Center(child: Text('Sales POS')), // Placeholder
    const Center(child: Text('Reports')), // Placeholder
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Store Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Provider.of<AuthProvider>(context, listen: false).logout(),
          )
        ],
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.inventory_2), label: 'Products'),
          NavigationDestination(icon: Icon(Icons.people), label: 'Customers'),
          NavigationDestination(icon: Icon(Icons.point_of_sale), label: 'Sales'),
          NavigationDestination(icon: Icon(Icons.analytics), label: 'Reports'),
        ],
      ),
    );
  }
}
