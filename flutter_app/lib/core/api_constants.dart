class ApiConstants {
  static const String baseUrl = 'http://10.0.2.2:8000'; // For Android emulator
  // static const String baseUrl = 'http://localhost:8000'; // For iOS/Web

  static const String login = '$baseUrl/auth/token';
  static const String register = '$baseUrl/auth/register';
  
  static const String adminShops = '$baseUrl/admin/shops';
  static const String adminLicenses = '$baseUrl/admin/licenses';

  static const String storeProducts = '$baseUrl/store/products';
  static const String storeCustomers = '$baseUrl/store/customers';
  static const String storeSales = '$baseUrl/store/sales';
  static const String storeDebts = '$baseUrl/store/debts';
}
