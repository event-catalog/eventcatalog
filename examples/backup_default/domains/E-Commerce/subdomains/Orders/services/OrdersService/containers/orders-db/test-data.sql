-- Insert sample orders
INSERT INTO orders (order_number, customer_name, customer_email, order_status, product_name, quantity, unit_price, total_amount, payment_method, payment_status, shipping_address) VALUES
('ORD-2024-001', 'John Doe', 'john.doe@email.com', 'delivered', 'MacBook Pro 14"', 1, 1999.99, 1999.99, 'credit_card', 'completed', '123 Main St, New York, NY 10001'),
('ORD-2024-002', 'Jane Smith', 'jane.smith@email.com', 'shipped', 'iPhone 15 Pro', 1, 999.99, 999.99, 'paypal', 'completed', '456 Oak Ave, Los Angeles, CA 90210'),
('ORD-2024-003', 'Michael Johnson', 'michael.johnson@email.com', 'processing', 'AirPods Pro', 2, 249.99, 499.98, 'credit_card', 'completed', '789 Pine Rd, Chicago, IL 60601'),
('ORD-2024-004', 'Emily Davis', 'emily.davis@email.com', 'pending', 'Cotton T-Shirt', 3, 19.99, 59.97, 'debit_card', 'pending', '321 Elm St, Houston, TX 77001'),
('ORD-2024-005', 'David Wilson', 'david.wilson@email.com', 'delivered', 'Smart Watch', 1, 299.99, 299.99, 'credit_card', 'completed', '654 Maple Dr, Phoenix, AZ 85001'),
('ORD-2024-006', 'Sarah Brown', 'sarah.brown@email.com', 'cancelled', 'Travel Backpack', 1, 79.99, 79.99, 'paypal', 'refunded', '987 Cedar Ln, Philadelphia, PA 19101'),
('ORD-2024-007', 'James Miller', 'james.miller@email.com', 'shipped', 'Premium Coffee Beans', 5, 24.99, 124.95, 'credit_card', 'completed', '147 Birch Way, San Antonio, TX 78201'),
('ORD-2024-008', 'Lisa Garcia', 'lisa.garcia@email.com', 'delivered', 'Running Sneakers', 1, 89.99, 89.99, 'apple_pay', 'completed', '258 Spruce St, San Diego, CA 92101'),
('ORD-2024-009', 'Robert Martinez', 'robert.martinez@email.com', 'processing', 'iPad Air', 1, 599.99, 599.99, 'google_pay', 'completed', '369 Willow Ave, Dallas, TX 75201'),
('ORD-2024-010', 'Jennifer Anderson', 'jennifer.anderson@email.com', 'pending', 'The Great Gatsby', 2, 12.99, 25.98, 'credit_card', 'pending', '741 Poplar Rd, San Jose, CA 95101'),
('ORD-2024-011', 'Mark Thompson', 'mark.thompson@email.com', 'delivered', 'Wireless Headphones', 1, 149.99, 149.99, 'paypal', 'completed', '852 Oak Street, Seattle, WA 98101'),
('ORD-2024-012', 'Amanda White', 'amanda.white@email.com', 'shipped', 'Gaming Mouse', 2, 79.99, 159.98, 'credit_card', 'completed', '963 Pine Avenue, Denver, CO 80201');