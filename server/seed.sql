-- AI Pawn Shop & Secondhand Dealer - Seed Data
-- Run after schema.sql

-- ============================================================
-- USERS (2)
-- ============================================================
INSERT INTO users (email, password, name, role) VALUES
('admin@pawnshop.com', '$2a$10$5QsK6ioxXhN4E8BG3rC2L.QhlxYnG8iRyfBxL7sid5F4J/9Fk/FBC', 'Mike Rossi', 'admin'),
('employee@pawnshop.com', '$2a$10$ZMpQ22xWKpiikLLrb/J7QOtToaK3uhCN79m.d7zruwfaMTJmHIUda', 'Sarah Chen', 'employee');

-- ============================================================
-- CUSTOMERS (20)
-- ============================================================
INSERT INTO customers (first_name, last_name, email, phone, address, city, state, zip, id_type, id_number, id_expiry, date_of_birth, notes, flagged, flag_reason) VALUES
('James', 'Martinez', 'james.martinez@email.com', '512-555-0101', '1420 Cedar Blvd', 'Austin', 'TX', '78701', 'drivers_license', 'TX-DL-84729301', '2027-03-15', '1985-06-12', 'Regular customer, mostly electronics', false, NULL),
('Linda', 'Washington', 'linda.w@email.com', '602-555-0192', '887 Maple Dr', 'Phoenix', 'AZ', '85001', 'drivers_license', 'AZ-DL-55103842', '2028-01-20', '1978-11-03', 'Prefers jewelry transactions', false, NULL),
('Robert', 'Nguyen', 'rnguyen@email.com', '303-555-0234', '2301 Pine St Apt 4B', 'Denver', 'CO', '80202', 'state_id', 'CO-ID-90127456', '2027-09-10', '1990-02-28', NULL, false, NULL),
('Maria', 'Garcia', 'mgarcia77@email.com', '210-555-0318', '5540 Oak Ave', 'San Antonio', 'TX', '78205', 'drivers_license', 'TX-DL-66201948', '2026-12-01', '1977-08-19', 'Frequent pawner', false, NULL),
('David', 'Thompson', 'dthompson@email.com', '404-555-0427', '312 Elm St', 'Atlanta', 'GA', '30301', 'passport', 'US-PP-547820163', '2031-05-22', '1982-04-07', NULL, false, NULL),
('Patricia', 'Robinson', 'probinson@email.com', '702-555-0533', '8821 Birch Ln', 'Las Vegas', 'NV', '89101', 'drivers_license', 'NV-DL-33098712', '2027-07-30', '1969-12-25', 'Collects vintage watches', false, NULL),
('Michael', 'Clark', NULL, '918-555-0649', '1100 Walnut St', 'Tulsa', 'OK', '74101', 'drivers_license', 'OK-DL-44810293', '2026-06-15', '1995-01-14', NULL, false, NULL),
('Jennifer', 'Lewis', 'jlewis@email.com', '615-555-0752', '760 Spruce Way', 'Nashville', 'TN', '37201', 'state_id', 'TN-ID-77203814', '2028-04-18', '1988-09-30', 'Musical instrument dealer', false, NULL),
('William', 'Walker', 'wwalker@email.com', '314-555-0861', '4455 Ash Dr', 'St. Louis', 'MO', '63101', 'drivers_license', 'MO-DL-11384720', '2027-11-05', '1973-03-22', NULL, true, 'Previously sold stolen merchandise - cleared by police'),
('Angela', 'Hall', 'ahall@email.com', '503-555-0978', '2290 Cypress Rd', 'Portland', 'OR', '97201', 'drivers_license', 'OR-DL-88512047', '2028-08-12', '1991-07-08', NULL, false, NULL),
('Charles', 'Young', 'cyoung55@email.com', '704-555-1084', '675 Hickory Ct', 'Charlotte', 'NC', '28201', 'military_id', 'US-MIL-20394817', '2029-02-28', '1980-05-17', 'Active military', false, NULL),
('Karen', 'King', NULL, '901-555-1193', '3310 Poplar Ave', 'Memphis', 'TN', '38101', 'drivers_license', 'TN-DL-55928301', '2027-01-09', '1965-10-31', NULL, false, NULL),
('Daniel', 'Wright', 'dwright@email.com', '816-555-1207', '1890 Sycamore Blvd', 'Kansas City', 'MO', '64101', 'drivers_license', 'MO-DL-22018473', '2026-09-20', '1993-12-03', 'Tool collector', false, NULL),
('Susan', 'Lopez', 'slopez@email.com', '505-555-1315', '4102 Juniper St', 'Albuquerque', 'NM', '87101', 'state_id', 'NM-ID-66394028', '2028-06-25', '1987-02-14', NULL, false, NULL),
('Thomas', 'Hill', 'thill@email.com', '402-555-1429', '555 Redwood Pl', 'Omaha', 'NE', '68101', 'drivers_license', 'NE-DL-99107382', '2027-04-11', '1976-08-06', 'Firearms collector - valid FFL on file', false, NULL),
('Jessica', 'Scott', 'jscott@email.com', '205-555-1536', '2780 Magnolia Dr', 'Birmingham', 'AL', '35201', 'drivers_license', 'AL-DL-44729018', '2028-10-30', '1984-11-21', NULL, false, NULL),
('Christopher', 'Adams', 'cadams@email.com', '501-555-1642', '920 Willow Ln', 'Little Rock', 'AR', '72201', 'passport', 'US-PP-881034726', '2030-03-14', '1970-06-09', NULL, true, 'Multiple disputed transactions'),
('Dorothy', 'Nelson', 'dnelson@email.com', '801-555-1758', '6341 Aspen Way', 'Salt Lake City', 'UT', '84101', 'drivers_license', 'UT-DL-77305819', '2027-12-22', '1992-04-18', NULL, false, NULL),
('Matthew', 'Carter', NULL, '419-555-1864', '1570 Chestnut Ave', 'Toledo', 'OH', '43601', 'state_id', 'OH-ID-33820174', '2026-08-07', '1998-01-30', 'Young collector, mostly sports memorabilia', false, NULL),
('Nancy', 'Mitchell', 'nmitchell@email.com', '904-555-1971', '8204 Palm Blvd', 'Jacksonville', 'FL', '32099', 'drivers_license', 'FL-DL-11294830', '2028-02-16', '1975-09-12', 'Estate sale dealer', false, NULL);

-- ============================================================
-- INVENTORY (25)
-- ============================================================
INSERT INTO inventory (category, subcategory, name, description, serial_number, brand, model, condition, cost_price, retail_price, status, location, customer_id, acquired_date, hold_until, notes) VALUES
('Electronics', 'Laptop', 'MacBook Pro 14"', '2023 MacBook Pro M2 Pro, 16GB RAM, 512GB SSD, Space Gray', 'C02ZN1MDLVCG', 'Apple', 'MacBook Pro 14 2023', 'good', 800.00, 1299.99, 'available', 'Shelf A1', 1, '2026-01-15', NULL, 'Minor scuff on bottom case'),
('Electronics', 'Gaming Console', 'PlayStation 5 Disc Edition', 'PS5 with one controller, power cable, HDMI', 'GH7829401KL', 'Sony', 'CFI-1215A', 'excellent', 280.00, 449.99, 'available', 'Shelf A2', 3, '2026-02-03', NULL, 'All original accessories included'),
('Jewelry', 'Ring', '14K Gold Diamond Engagement Ring', '14K yellow gold, 0.75ct center diamond, VS1 clarity, G color', NULL, NULL, NULL, 'excellent', 1200.00, 2499.99, 'on_loan', 'Safe 1', 2, '2026-01-20', NULL, 'Appraised at $3,200'),
('Jewelry', 'Necklace', '18K Gold Cuban Link Chain', '18K gold, 24 inch, 45 grams, 8mm width', NULL, NULL, NULL, 'good', 1800.00, 3299.99, 'available', 'Safe 1', 4, '2026-02-10', NULL, 'Acid tested - confirmed 18K'),
('Musical Instruments', 'Guitar', 'Gibson Les Paul Standard', '2019 Gibson Les Paul Standard 50s, Heritage Cherry Sunburst', 'GIB219480173', 'Gibson', 'Les Paul Standard 50s', 'good', 1100.00, 1899.99, 'on_layaway', 'Wall Rack B1', 8, '2025-12-18', NULL, 'Original hardshell case included'),
('Musical Instruments', 'Amplifier', 'Fender Blues Junior IV', '15-watt tube combo amp, tweed covering', 'FEN-BJ4-092817', 'Fender', 'Blues Junior IV', 'fair', 350.00, 599.99, 'available', 'Floor B2', 8, '2026-01-05', NULL, 'One tube replaced'),
('Tools', 'Power Tool Set', 'DeWalt 20V MAX Combo Kit', '5-tool combo with 2 batteries, charger, and bag', 'DW20V-5T-38291', 'DeWalt', 'DCK590L2', 'good', 220.00, 399.99, 'available', 'Shelf C1', 13, '2026-02-15', NULL, NULL),
('Tools', 'Welder', 'Lincoln Electric MIG Welder', 'Handy MIG welder, 115V, wire feed', 'LIN-MIG-U1180120', 'Lincoln Electric', 'K2185-1', 'fair', 180.00, 349.99, 'on_hold', 'Floor C2', 13, '2026-01-28', '2026-04-28', 'Police hold - matching description in report'),
('Firearms', 'Handgun', 'Glock 19 Gen 5', '9mm semi-auto, 15rd capacity, night sights', 'GLK-BFXR719', 'Glock', '19 Gen5', 'excellent', 350.00, 549.99, 'available', 'Gun Safe', 15, '2026-01-10', NULL, 'Two magazines included'),
('Firearms', 'Rifle', 'Remington 700 SPS', '.308 Win bolt-action, synthetic stock, 24" barrel', 'REM-G7284910', 'Remington', '700 SPS', 'good', 420.00, 699.99, 'on_loan', 'Gun Safe', 15, '2025-11-22', NULL, 'Includes Vortex Crossfire II scope'),
('Firearms', 'Shotgun', 'Mossberg 500 Persuader', '12ga pump-action, 20" barrel, 7+1 capacity', 'MOS-V5820391', 'Mossberg', '500 Persuader', 'good', 250.00, 429.99, 'available', 'Gun Safe', 11, '2026-02-20', NULL, NULL),
('Watches', 'Luxury Watch', 'Rolex Submariner Date', 'Ref 116610LN, black dial, ceramic bezel, 2018', 'ROL-7YN29384', 'Rolex', 'Submariner 116610LN', 'excellent', 7500.00, 11999.99, 'on_loan', 'Safe 2', 6, '2025-12-05', NULL, 'Box and papers included, authenticated'),
('Watches', 'Luxury Watch', 'Omega Speedmaster Professional', 'Moonwatch, ref 311.30.42.30.01.005, hesalite crystal', 'OMG-84201738', 'Omega', 'Speedmaster Professional', 'good', 3200.00, 5299.99, 'available', 'Safe 2', 6, '2026-01-30', NULL, 'Some desk-diving marks on bracelet'),
('Collectibles', 'Trading Cards', 'PSA 9 Charizard Base Set', '1999 Pokemon Base Set Charizard Holo, PSA Graded 9', 'PSA-48291037', NULL, NULL, 'mint', 280.00, 499.99, 'available', 'Display Case D1', 19, '2026-02-08', NULL, 'PSA slab intact, cert verified'),
('Collectibles', 'Coins', '1921 Morgan Silver Dollar', 'MS63 grade, Philadelphia mint, original luster', 'NGC-7192834', NULL, NULL, 'excellent', 45.00, 89.99, 'available', 'Safe 1', 20, '2026-03-01', NULL, 'NGC certified'),
('Sporting Goods', 'Golf Clubs', 'Titleist TSi3 Driver', '9 degree, Project X HZRDUS Smoke shaft, stiff flex', NULL, 'Titleist', 'TSi3', 'good', 180.00, 329.99, 'available', 'Shelf D2', 19, '2026-02-12', NULL, 'Headcover included'),
('Electronics', 'Camera', 'Canon EOS R6 Mark II', 'Mirrorless camera body, 24.2MP, 4K60', 'CAN-012849301', 'Canon', 'EOS R6 Mark II', 'excellent', 1400.00, 2199.99, 'on_loan', 'Shelf A3', 5, '2026-01-22', NULL, 'Body only, no lens'),
('Electronics', 'Tablet', 'iPad Pro 12.9" M2', '256GB, Space Gray, WiFi only, with Apple Pencil 2', 'DMP-XK48291037', 'Apple', 'iPad Pro 12.9 M2', 'good', 500.00, 849.99, 'on_layaway', 'Shelf A1', 14, '2026-02-05', NULL, 'Minor scratch on screen'),
('Jewelry', 'Bracelet', 'David Yurman Cable Bracelet', '5mm sterling silver with 14K gold dome, medium', 'DY-SC5M-18294', 'David Yurman', 'Cable Classic', 'excellent', 220.00, 399.99, 'available', 'Safe 1', 16, '2026-03-05', NULL, NULL),
('Electronics', 'Smartphone', 'Samsung Galaxy S24 Ultra', '256GB, Titanium Black, unlocked', 'RF2X-90WB48K', 'Samsung', 'Galaxy S24 Ultra', 'good', 450.00, 749.99, 'sold', 'Shelf A2', 7, '2026-01-08', NULL, 'Factory reset, clean IMEI'),
('Musical Instruments', 'Keyboard', 'Yamaha P-125 Digital Piano', '88 weighted keys, with sustain pedal and stand', 'YAM-JBWN82910', 'Yamaha', 'P-125', 'good', 300.00, 549.99, 'available', 'Floor B3', 8, '2026-02-22', NULL, NULL),
('Tools', 'Air Compressor', 'Porter-Cable 6-Gallon Pancake', '150 PSI, oil-free, with hose', 'PC-C2002-WK481', 'Porter-Cable', 'C2002', 'fair', 60.00, 119.99, 'available', 'Floor C3', 13, '2026-03-10', NULL, 'Runs loud but works well'),
('Sporting Goods', 'Bicycle', 'Trek Marlin 7', '2024, Large frame, 29" wheels, Deore drivetrain', 'WTU-293KP810Z', 'Trek', 'Marlin 7', 'good', 400.00, 699.99, 'on_layaway', 'Floor D1', 10, '2026-01-18', NULL, 'Recently tuned'),
('Jewelry', 'Watch', 'Tag Heuer Carrera', 'Calibre 16 Chronograph, 41mm, blue dial', 'TAG-CBK2112-WX9', 'Tag Heuer', 'Carrera CBK2112', 'good', 1800.00, 2999.99, 'on_loan', 'Safe 2', 5, '2026-02-01', NULL, 'Authentic, service records available'),
('Electronics', 'Drone', 'DJI Mavic 3 Classic', 'Drone with RC controller, 3 batteries, carry case', 'DJI-1MC3R-48291', 'DJI', 'Mavic 3 Classic', 'excellent', 700.00, 1149.99, 'available', 'Shelf A4', 3, '2026-03-08', NULL, 'Low flight hours, all props intact');

-- ============================================================
-- LOANS (18)
-- ============================================================
INSERT INTO loans (ticket_number, customer_id, inventory_id, item_description, principal_amount, interest_rate, loan_date, maturity_date, status, total_due, notes) VALUES
('PL-2026-0001', 2, 3, '14K Gold Diamond Engagement Ring, 0.75ct, VS1/G', 1200.00, 20.00, '2026-01-20', '2026-04-20', 'active', 1440.00, NULL),
('PL-2026-0002', 6, 12, 'Rolex Submariner Date, Ref 116610LN, 2018', 7500.00, 15.00, '2025-12-05', '2026-03-05', 'extended', 8625.00, 'Extended once already'),
('PL-2026-0003', 15, 10, 'Remington 700 SPS .308 Win with Vortex scope', 420.00, 20.00, '2025-11-22', '2026-02-22', 'active', 504.00, NULL),
('PL-2026-0004', 5, 17, 'Canon EOS R6 Mark II mirrorless camera body', 1400.00, 18.00, '2026-01-22', '2026-04-22', 'active', 1652.00, NULL),
('PL-2026-0005', 5, 24, 'Tag Heuer Carrera Calibre 16 Chronograph', 1800.00, 18.00, '2026-02-01', '2026-05-01', 'active', 2124.00, NULL),
('PL-2026-0006', 1, NULL, 'Sony 65" Bravia XR A80K OLED TV', 600.00, 22.00, '2025-10-15', '2026-01-15', 'defaulted', 732.00, 'Customer did not redeem, item forfeited'),
('PL-2026-0007', 4, NULL, 'Tiffany & Co. sterling silver cuff bracelet', 250.00, 20.00, '2025-11-01', '2026-02-01', 'redeemed', 300.00, 'Redeemed on 2026-01-28'),
('PL-2026-0008', 7, NULL, 'Xbox Series X with 2 controllers', 220.00, 22.00, '2025-12-10', '2026-03-10', 'redeemed', 268.40, 'Redeemed on 2026-03-08'),
('PL-2026-0009', 9, NULL, 'Snap-On tool chest, 40" rolling cabinet', 800.00, 20.00, '2025-09-20', '2025-12-20', 'defaulted', 960.00, 'Flagged customer, item sent to auction'),
('PL-2026-0010', 11, NULL, 'Benchmade Infidel OTF Knife, limited edition', 180.00, 22.00, '2026-02-14', '2026-05-14', 'active', 219.60, NULL),
('PL-2026-0011', 3, NULL, 'Bose QuietComfort Ultra Headphones', 150.00, 22.00, '2026-01-10', '2026-04-10', 'active', 183.00, NULL),
('PL-2026-0012', 14, NULL, 'Breitling Navitimer, Ref AB0121, 43mm', 2800.00, 15.00, '2025-12-20', '2026-03-20', 'in_grace_period', 3220.00, 'Grace period until 2026-04-05'),
('PL-2026-0013', 16, NULL, 'Pearl Export drum kit, 5-piece with hardware', 350.00, 20.00, '2026-02-08', '2026-05-08', 'active', 420.00, NULL),
('PL-2026-0014', 18, NULL, 'KitchenAid Professional 600 Stand Mixer', 120.00, 22.00, '2026-01-25', '2026-04-25', 'active', 146.40, NULL),
('PL-2026-0015', 12, NULL, 'Vintage Martin D-28 acoustic guitar, 1972', 2000.00, 15.00, '2025-10-30', '2026-01-30', 'defaulted', 2300.00, 'Sent to auction'),
('PL-2026-0016', 20, NULL, 'Estate jewelry lot - 8 pieces, mixed gold/silver', 950.00, 18.00, '2026-02-20', '2026-05-20', 'active', 1121.00, NULL),
('PL-2026-0017', 10, NULL, 'Milwaukee M18 FUEL 7-tool combo kit', 400.00, 20.00, '2026-03-01', '2026-06-01', 'active', 480.00, 'New customer loan'),
('PL-2026-0018', 17, NULL, 'Sig Sauer P320 X-Five Legion, 9mm', 500.00, 18.00, '2025-11-15', '2026-02-15', 'extended', 590.00, 'Extended to 2026-04-15');

-- ============================================================
-- LOAN PAYMENTS (15)
-- ============================================================
INSERT INTO loan_payments (loan_id, amount, payment_type, payment_date, notes) VALUES
(7, 300.00, 'redemption', '2026-01-28', 'Full redemption payment'),
(8, 268.40, 'redemption', '2026-03-08', 'Full redemption payment'),
(2, 125.00, 'interest', '2026-01-05', 'Monthly interest payment'),
(2, 125.00, 'interest', '2026-02-05', 'Monthly interest payment'),
(1, 80.00, 'interest', '2026-02-20', 'Monthly interest payment'),
(3, 28.00, 'interest', '2025-12-22', 'Monthly interest payment'),
(3, 28.00, 'interest', '2026-01-22', 'Monthly interest payment'),
(4, 84.00, 'interest', '2026-02-22', 'Monthly interest payment'),
(5, 108.00, 'interest', '2026-03-01', 'Monthly interest payment'),
(11, 11.00, 'interest', '2026-02-10', 'Monthly interest payment'),
(12, 140.00, 'interest', '2026-01-20', 'Monthly interest payment'),
(12, 140.00, 'interest', '2026-02-20', 'Monthly interest payment'),
(13, 23.33, 'interest', '2026-03-08', 'Monthly interest payment'),
(14, 8.80, 'interest', '2026-02-25', 'Monthly interest payment'),
(16, 57.00, 'interest', '2026-03-20', 'Monthly interest payment');

-- ============================================================
-- LOAN EXTENSIONS (8)
-- ============================================================
INSERT INTO loan_extensions (loan_id, old_maturity_date, new_maturity_date, extension_fee, extension_date, notes) VALUES
(2, '2026-03-05', '2026-06-05', 375.00, '2026-03-03', 'Customer requested 90-day extension'),
(18, '2026-02-15', '2026-04-15', 45.00, '2026-02-13', 'Customer paid extension fee'),
(6, '2026-01-15', '2026-02-15', 44.00, '2026-01-14', 'One-month extension granted before default'),
(9, '2025-12-20', '2026-01-20', 53.33, '2025-12-18', 'Extension granted, still defaulted'),
(15, '2026-01-30', '2026-02-28', 100.00, '2026-01-28', 'One-month extension before default'),
(3, '2026-02-22', '2026-04-22', 28.00, '2026-02-20', 'Customer requested extension'),
(12, '2026-03-20', '2026-04-20', 140.00, '2026-03-18', 'Grace period extension'),
(1, '2026-04-20', '2026-05-20', 80.00, '2026-03-15', 'Preemptive extension');

-- ============================================================
-- LAYAWAYS (15)
-- ============================================================
INSERT INTO layaways (customer_id, inventory_id, total_price, down_payment, monthly_payment, remaining_balance, start_date, due_date, status, notes) VALUES
(8, 5, 1899.99, 380.00, 253.33, 1013.32, '2025-12-18', '2026-06-18', 'active', 'Gibson Les Paul - 6 month plan'),
(14, 18, 849.99, 170.00, 113.33, 453.33, '2026-02-05', '2026-08-05', 'active', 'iPad Pro layaway'),
(10, 23, 699.99, 140.00, 93.33, 466.66, '2026-01-18', '2026-07-18', 'active', 'Trek Marlin 7 bicycle'),
(1, 1, 1299.99, 260.00, 173.33, 693.33, '2026-01-15', '2026-07-15', 'active', 'MacBook Pro layaway'),
(3, 2, 449.99, 90.00, 60.00, 240.00, '2026-02-03', '2026-08-03', 'active', 'PS5 layaway'),
(16, 19, 399.99, 80.00, 53.33, 213.33, '2026-03-05', '2026-09-05', 'active', 'David Yurman bracelet'),
(7, 6, 599.99, 120.00, 80.00, 320.00, '2026-01-05', '2026-07-05', 'active', 'Fender Blues Junior amp'),
(11, 11, 429.99, 86.00, 57.33, 229.33, '2026-02-20', '2026-08-20', 'active', 'Mossberg 500'),
(19, 14, 499.99, 100.00, 66.67, 266.66, '2026-02-08', '2026-08-08', 'active', 'Charizard PSA 9 card'),
(5, 13, 5299.99, 1060.00, 706.67, 2826.66, '2026-01-30', '2026-07-30', 'active', 'Omega Speedmaster'),
(20, 15, 89.99, 18.00, 12.00, 47.99, '2026-03-01', '2026-09-01', 'active', 'Morgan Silver Dollar'),
(4, 4, 3299.99, 660.00, 440.00, 1320.00, '2026-02-10', '2026-08-10', 'defaulted', 'Customer missed 2 payments'),
(12, 21, 549.99, 110.00, 73.33, 0.00, '2025-11-15', '2026-05-15', 'completed', 'Yamaha P-125 - paid off early'),
(9, 7, 399.99, 80.00, 53.33, 213.33, '2026-02-15', '2026-08-15', 'cancelled', 'Customer requested cancellation'),
(18, 22, 119.99, 24.00, 16.00, 63.99, '2026-03-10', '2026-09-10', 'active', 'Porter-Cable compressor');

-- ============================================================
-- LAYAWAY PAYMENTS (15)
-- ============================================================
INSERT INTO layaway_payments (layaway_id, amount, payment_date, notes) VALUES
(1, 253.33, '2026-01-18', 'Month 1 payment'),
(1, 253.33, '2026-02-18', 'Month 2 payment'),
(2, 113.33, '2026-03-05', 'Month 1 payment'),
(3, 93.33, '2026-02-18', 'Month 1 payment'),
(4, 173.33, '2026-02-15', 'Month 1 payment'),
(4, 173.33, '2026-03-15', 'Month 2 payment'),
(5, 60.00, '2026-03-03', 'Month 1 payment'),
(7, 80.00, '2026-02-05', 'Month 1 payment'),
(7, 80.00, '2026-03-05', 'Month 2 payment'),
(9, 66.67, '2026-03-08', 'Month 1 payment'),
(10, 706.67, '2026-02-28', 'Month 1 payment'),
(10, 706.67, '2026-03-15', 'Month 2 payment - early'),
(11, 12.00, '2026-03-15', 'Month 1 payment - small item'),
(13, 439.99, '2025-12-15', 'Paid off remaining balance early'),
(15, 16.00, '2026-03-20', 'Month 1 payment');

-- ============================================================
-- HOLD PERIODS (15)
-- ============================================================
INSERT INTO hold_periods (inventory_id, hold_type, start_date, end_date, police_case_number, officer_name, officer_badge, department, status, notes) VALUES
(8, 'police_hold', '2026-01-28', '2026-04-28', 'PD-2026-00412', 'Det. Robert Kowalski', 'B-4471', 'Metro PD Property Crimes', 'active', 'Matches description of stolen welder from local shop'),
(1, 'standard_hold', '2026-01-15', '2026-02-14', NULL, NULL, NULL, NULL, 'expired', 'Standard 30-day acquisition hold'),
(2, 'standard_hold', '2026-02-03', '2026-03-05', NULL, NULL, NULL, NULL, 'expired', 'Standard 30-day hold'),
(4, 'standard_hold', '2026-02-10', '2026-03-12', NULL, NULL, NULL, NULL, 'expired', 'Standard 30-day hold'),
(9, 'standard_hold', '2026-01-10', '2026-02-09', NULL, NULL, NULL, NULL, 'expired', 'Firearm 30-day hold'),
(10, 'standard_hold', '2025-11-22', '2025-12-22', NULL, NULL, NULL, NULL, 'expired', 'Firearm 30-day hold'),
(11, 'standard_hold', '2026-02-20', '2026-03-22', NULL, NULL, NULL, NULL, 'active', 'Firearm 30-day hold'),
(20, 'standard_hold', '2026-01-08', '2026-02-07', NULL, NULL, NULL, NULL, 'expired', 'Standard 30-day hold'),
(25, 'standard_hold', '2026-03-08', '2026-04-07', NULL, NULL, NULL, NULL, 'active', 'Standard 30-day hold'),
(7, 'standard_hold', '2026-02-15', '2026-03-17', NULL, NULL, NULL, NULL, 'expired', 'Standard 30-day hold'),
(14, 'police_hold', '2026-03-01', '2026-06-01', 'PD-2026-00587', 'Det. Angela Reeves', 'B-3318', 'County Sheriff Dept', 'active', 'Investigating source of PSA graded card'),
(16, 'standard_hold', '2026-02-12', '2026-03-14', NULL, NULL, NULL, NULL, 'expired', 'Standard 30-day hold'),
(17, 'standard_hold', '2026-01-22', '2026-02-21', NULL, NULL, NULL, NULL, 'expired', 'Standard 30-day hold'),
(19, 'standard_hold', '2026-03-05', '2026-04-04', NULL, NULL, NULL, NULL, 'active', 'Standard 30-day hold'),
(22, 'standard_hold', '2026-03-10', '2026-04-09', NULL, NULL, NULL, NULL, 'active', 'Standard 30-day hold');

-- ============================================================
-- PRECIOUS METALS LOG (15)
-- ============================================================
INSERT INTO precious_metals_log (inventory_id, customer_id, metal_type, purity, weight_grams, test_method, test_result, tested_by, test_date, market_price_per_gram, estimated_value, notes) VALUES
(3, 2, 'gold', '14K', 5.200, 'acid_test', 'pass', 'Mike Rossi', '2026-01-20', 45.80, 238.16, 'Ring band weight only, excludes diamond'),
(4, 4, 'gold', '18K', 45.000, 'acid_test', 'pass', 'Mike Rossi', '2026-02-10', 58.20, 2619.00, 'Cuban link chain'),
(19, 16, 'silver', '925', 32.500, 'acid_test', 'pass', 'Sarah Chen', '2026-03-05', 0.95, 30.88, 'Sterling silver cable bracelet with 14K gold accents'),
(NULL, 2, 'gold', '10K', 8.700, 'acid_test', 'pass', 'Mike Rossi', '2026-01-20', 32.10, 279.27, 'Additional ring tested at same visit'),
(NULL, 4, 'gold', '14K', 12.300, 'acid_test', 'pass', 'Sarah Chen', '2026-02-10', 45.80, 563.34, 'Herringbone chain also tested'),
(NULL, 20, 'gold', '18K', 28.600, 'electronic_tester', 'pass', 'Mike Rossi', '2026-02-20', 58.20, 1664.52, 'Estate lot - gold pieces'),
(NULL, 20, 'silver', '925', 185.400, 'acid_test', 'pass', 'Mike Rossi', '2026-02-20', 0.95, 176.13, 'Estate lot - silver pieces'),
(NULL, 20, 'platinum', '950', 6.200, 'electronic_tester', 'pass', 'Mike Rossi', '2026-02-20', 32.50, 201.50, 'Estate lot - platinum ring'),
(15, 20, 'silver', '900', 26.730, 'acid_test', 'pass', 'Sarah Chen', '2026-03-01', 0.95, 25.39, 'Morgan silver dollar - 90% silver'),
(NULL, 14, 'gold', '22K', 3.100, 'acid_test', 'pass', 'Mike Rossi', '2026-01-15', 67.40, 208.94, 'Indian gold bangle tested'),
(NULL, 6, 'gold', '18K', 95.200, 'xrf_analyzer', 'pass', 'Mike Rossi', '2025-12-05', 58.20, 5540.64, 'Rolex case and bracelet - non-destructive test'),
(NULL, 6, 'gold', '18K', 72.800, 'xrf_analyzer', 'pass', 'Mike Rossi', '2026-01-30', 58.20, 4236.96, 'Omega case and bracelet - non-destructive test'),
(NULL, 12, 'silver', '925', 142.000, 'acid_test', 'pass', 'Sarah Chen', '2025-11-15', 0.95, 134.90, 'Assorted sterling flatware'),
(NULL, 9, 'gold', '14K', 18.500, 'acid_test', 'fail', 'Mike Rossi', '2025-10-05', 45.80, 0.00, 'Item tested as gold-plated, not solid 14K as claimed'),
(NULL, 1, 'silver', '999', 311.000, 'acid_test', 'pass', 'Sarah Chen', '2026-03-12', 0.95, 295.45, '10 oz fine silver bar');

-- ============================================================
-- FIREARM LOG (15)
-- ============================================================
INSERT INTO firearm_log (inventory_id, customer_id, manufacturer, model, serial_number, caliber, firearm_type, action_type, barrel_length, transaction_type, transaction_date, acquisition_disposition, nics_check_number, nics_check_date, nics_result, notes) VALUES
(9, 15, 'Glock', '19 Gen5', 'GLK-BFXR719', '9mm Luger', 'pistol', 'semi-automatic', '4.02"', 'pawn_intake', '2026-01-10', 'acquisition', NULL, NULL, NULL, 'Acquired via pawn loan'),
(10, 15, 'Remington', '700 SPS', 'REM-G7284910', '.308 Winchester', 'rifle', 'bolt-action', '24"', 'pawn_intake', '2025-11-22', 'acquisition', NULL, NULL, NULL, 'Acquired via pawn loan, includes scope'),
(11, 11, 'Mossberg', '500 Persuader', 'MOS-V5820391', '12 Gauge', 'shotgun', 'pump-action', '20"', 'purchase', '2026-02-20', 'acquisition', NULL, NULL, NULL, 'Direct purchase from customer'),
(NULL, 15, 'Smith & Wesson', 'M&P Shield Plus', 'SWM-TK4829103', '9mm Luger', 'pistol', 'semi-automatic', '3.1"', 'sale', '2026-01-25', 'disposition', 'NIC-2026-88401', '2026-01-25', 'proceed', 'Sold to customer after background check'),
(NULL, 11, 'Ruger', '10/22 Carbine', 'RGR-281-04938', '.22 LR', 'rifle', 'semi-automatic', '18.5"', 'sale', '2025-12-15', 'disposition', 'NIC-2025-99201', '2025-12-15', 'proceed', 'Sold to customer'),
(NULL, 7, 'Springfield Armory', 'Hellcat Pro', 'SA-HC7291048', '9mm Luger', 'pistol', 'semi-automatic', '3.7"', 'pawn_intake', '2026-02-01', 'acquisition', NULL, NULL, NULL, 'Acquired via pawn, redeemed 2026-03-01'),
(NULL, 7, 'Springfield Armory', 'Hellcat Pro', 'SA-HC7291048', '9mm Luger', 'pistol', 'semi-automatic', '3.7"', 'pawn_redemption', '2026-03-01', 'disposition', NULL, NULL, NULL, 'Redeemed by original pawner'),
(NULL, 17, 'Sig Sauer', 'P320 X-Five Legion', 'SIG-58X2910L4', '9mm Luger', 'pistol', 'semi-automatic', '5"', 'pawn_intake', '2025-11-15', 'acquisition', NULL, NULL, NULL, 'Extended loan, still in possession'),
(NULL, 5, 'Beretta', '92FS', 'BER-D48291K03', '9mm Luger', 'pistol', 'semi-automatic', '4.9"', 'purchase', '2026-03-10', 'acquisition', NULL, NULL, NULL, 'Direct purchase'),
(NULL, 19, 'Henry', 'Big Boy', 'HEN-BB44-09281', '.44 Magnum', 'rifle', 'lever-action', '20"', 'purchase', '2026-02-28', 'acquisition', NULL, NULL, NULL, 'Direct purchase, brass receiver'),
(NULL, 15, 'Colt', 'Python', 'CLT-PY82910473', '.357 Magnum', 'revolver', 'double-action', '6"', 'sale', '2026-03-05', 'disposition', 'NIC-2026-91003', '2026-03-05', 'proceed', 'Sold after 30-day hold'),
(NULL, 11, 'Benelli', 'Nova', 'BEN-NV48291037', '12 Gauge', 'shotgun', 'pump-action', '28"', 'pawn_intake', '2026-03-15', 'acquisition', NULL, NULL, NULL, 'Pawn loan collateral'),
(NULL, 20, 'Winchester', 'SXP Defender', 'WIN-SXP-83019K', '12 Gauge', 'shotgun', 'pump-action', '18"', 'sale', '2026-01-20', 'disposition', 'NIC-2026-84102', '2026-01-20', 'proceed', 'Sold to customer'),
(NULL, 3, 'Taurus', 'G3c', 'TAU-G3C-29401K', '9mm Luger', 'pistol', 'semi-automatic', '3.2"', 'pawn_intake', '2026-03-18', 'acquisition', NULL, NULL, NULL, 'New pawn loan'),
(NULL, 10, 'CZ', 'P-10 C', 'CZ-P10C-8291047', '9mm Luger', 'pistol', 'semi-automatic', '4.02"', 'sale', '2026-02-10', 'disposition', 'NIC-2026-87503', '2026-02-10', 'delayed', 'NICS delayed - approved after 3 days');

-- ============================================================
-- POLICE REPORTS (15)
-- ============================================================
INSERT INTO police_reports (report_date, report_type, department, officer_name, badge_number, status, notes) VALUES
('2026-01-28', 'stolen_property', 'Metro PD Property Crimes', 'Det. Robert Kowalski', 'B-4471', 'active', 'Lincoln welder matches description of stolen property'),
('2026-03-01', 'investigation', 'County Sheriff Dept', 'Det. Angela Reeves', 'B-3318', 'active', 'PSA graded Charizard card - investigating provenance'),
('2026-01-05', 'daily_transaction', 'Metro PD', 'Ofc. Tom Bradley', 'B-2201', 'completed', 'Routine daily transaction report'),
('2026-01-12', 'daily_transaction', 'Metro PD', 'Ofc. Tom Bradley', 'B-2201', 'completed', 'Routine daily transaction report'),
('2026-01-19', 'daily_transaction', 'Metro PD', 'Ofc. Tom Bradley', 'B-2201', 'completed', 'Routine daily transaction report'),
('2026-01-26', 'daily_transaction', 'Metro PD', 'Ofc. Tom Bradley', 'B-2201', 'completed', 'Routine daily transaction report'),
('2026-02-02', 'daily_transaction', 'Metro PD', 'Ofc. Maria Santos', 'B-3309', 'completed', 'Routine daily transaction report'),
('2026-02-09', 'daily_transaction', 'Metro PD', 'Ofc. Maria Santos', 'B-3309', 'completed', 'Routine daily transaction report'),
('2026-02-16', 'daily_transaction', 'Metro PD', 'Ofc. Maria Santos', 'B-3309', 'completed', 'Routine daily transaction report'),
('2026-02-23', 'daily_transaction', 'Metro PD', 'Ofc. Maria Santos', 'B-3309', 'completed', 'Routine daily transaction report'),
('2026-03-02', 'daily_transaction', 'Metro PD', 'Ofc. Tom Bradley', 'B-2201', 'completed', 'Routine daily transaction report'),
('2026-03-09', 'daily_transaction', 'Metro PD', 'Ofc. Tom Bradley', 'B-2201', 'completed', 'Routine daily transaction report'),
('2026-03-16', 'daily_transaction', 'Metro PD', 'Ofc. Tom Bradley', 'B-2201', 'completed', 'Routine daily transaction report'),
('2026-02-14', 'stolen_property', 'State Police', 'Trooper James Holt', 'SP-1192', 'resolved', 'Serial number check on electronics - all clear'),
('2026-03-20', 'flagged_customer', 'Metro PD', 'Det. Robert Kowalski', 'B-4471', 'pending', 'Follow-up on Christopher Adams flagged transactions');

-- ============================================================
-- POLICE REPORT ITEMS (18 items across reports)
-- ============================================================
INSERT INTO police_report_items (report_id, inventory_id, customer_id, transaction_type, item_description, serial_number, amount) VALUES
(1, 8, 13, 'purchase', 'Lincoln Electric MIG Welder', 'LIN-MIG-U1180120', 180.00),
(2, 14, 19, 'purchase', 'PSA 9 Charizard Base Set card', 'PSA-48291037', 280.00),
(3, NULL, 1, 'pawn', 'MacBook Pro 14" M2 Pro', 'C02ZN1MDLVCG', 800.00),
(4, NULL, 15, 'pawn', 'Glock 19 Gen 5', 'GLK-BFXR719', 350.00),
(5, NULL, 2, 'pawn', '14K Gold Diamond Ring', NULL, 1200.00),
(6, NULL, 4, 'purchase', '18K Gold Cuban Link Chain', NULL, 1800.00),
(7, NULL, 3, 'pawn', 'PlayStation 5', 'GH7829401KL', 280.00),
(7, NULL, 8, 'purchase', 'Fender Blues Junior IV amp', 'FEN-BJ4-092817', 350.00),
(8, NULL, 13, 'purchase', 'DeWalt 20V Combo Kit', 'DW20V-5T-38291', 220.00),
(9, NULL, 6, 'pawn', 'Omega Speedmaster Professional', 'OMG-84201738', 3200.00),
(10, NULL, 5, 'pawn', 'Canon EOS R6 Mark II', 'CAN-012849301', 1400.00),
(10, NULL, 5, 'pawn', 'Tag Heuer Carrera', 'TAG-CBK2112-WX9', 1800.00),
(11, NULL, 11, 'purchase', 'Mossberg 500 Persuader', 'MOS-V5820391', 250.00),
(12, NULL, 19, 'purchase', 'Titleist TSi3 Driver', NULL, 180.00),
(13, NULL, 3, 'purchase', 'DJI Mavic 3 Classic', 'DJI-1MC3R-48291', 700.00),
(14, NULL, 7, 'pawn', 'Samsung Galaxy S24 Ultra', 'RF2X-90WB48K', 450.00),
(14, NULL, 14, 'pawn', 'iPad Pro 12.9" M2', 'DMP-XK48291037', 500.00),
(15, NULL, 17, 'pawn', 'Items from flagged customer Christopher Adams', NULL, 0.00);

-- ============================================================
-- CASH DRAWERS (2)
-- ============================================================
INSERT INTO cash_drawers (drawer_name, location, opening_balance, current_balance, status, opened_by, opened_at, closed_at) VALUES
('Main Register', 'Front Counter', 500.00, 2847.33, 'open', 1, '2026-03-23 08:00:00', NULL),
('Back Office', 'Manager Office', 1000.00, 3215.00, 'open', 1, '2026-03-23 08:30:00', NULL);

-- ============================================================
-- CASH DRAWER TRANSACTIONS (15)
-- ============================================================
INSERT INTO cash_drawer_transactions (drawer_id, transaction_type, amount, reference_type, reference_id, description, performed_by, created_at) VALUES
(1, 'opening', 500.00, NULL, NULL, 'Opening balance', 1, '2026-03-23 08:00:00'),
(2, 'opening', 1000.00, NULL, NULL, 'Opening balance', 1, '2026-03-23 08:30:00'),
(1, 'cash_in', 300.00, 'loan_redemption', 7, 'Loan PL-2026-0007 redemption by Maria Garcia', 2, '2026-03-23 09:15:00'),
(1, 'cash_out', 220.00, 'purchase', 7, 'Purchase of DeWalt combo kit from Daniel Wright', 2, '2026-03-23 09:45:00'),
(1, 'cash_in', 268.40, 'loan_redemption', 8, 'Loan PL-2026-0008 redemption by Michael Clark', 2, '2026-03-23 10:30:00'),
(1, 'cash_in', 80.00, 'loan_interest', 1, 'Interest payment on loan PL-2026-0001', 2, '2026-03-23 11:00:00'),
(1, 'cash_out', 180.00, 'purchase', 16, 'Purchase of Titleist driver from Matthew Carter', 2, '2026-03-23 11:30:00'),
(2, 'cash_in', 749.99, 'retail_sale', 20, 'Sale of Samsung Galaxy S24 Ultra', 1, '2026-03-23 10:00:00'),
(2, 'cash_out', 700.00, 'purchase', 25, 'Purchase of DJI Mavic 3 from Robert Nguyen', 1, '2026-03-23 10:45:00'),
(1, 'cash_in', 253.33, 'layaway_payment', 1, 'Layaway payment - Gibson Les Paul for Jennifer Lewis', 2, '2026-03-23 12:00:00'),
(2, 'cash_in', 1400.00, 'pawn_loan_new', 4, 'New pawn loan - Canon R6 from David Thompson', 1, '2026-03-23 13:00:00'),
(1, 'cash_in', 549.99, 'retail_sale', 6, 'Sale of Fender Blues Junior IV', 2, '2026-03-23 13:30:00'),
(2, 'cash_out', 500.00, 'pawn_loan_new', 18, 'New pawn loan - Sig P320 from Christopher Adams', 1, '2026-03-23 14:00:00'),
(1, 'cash_in', 1295.61, 'retail_sale', NULL, 'Multiple small item sales', 2, '2026-03-23 15:00:00'),
(2, 'cash_in', 1265.01, 'retail_sale', NULL, 'Afternoon sales batch', 1, '2026-03-23 16:00:00');

-- ============================================================
-- RECEIPTS (15)
-- ============================================================
INSERT INTO receipts (receipt_number, receipt_type, customer_id, loan_id, items, subtotal, tax, total, payment_method, notes) VALUES
('RCP-2026-0001', 'pawn_loan', 2, 1, '{"items": [{"name": "14K Gold Diamond Engagement Ring", "amount": 1200.00}]}', 1200.00, 0.00, 1200.00, 'cash', 'Pawn loan issued'),
('RCP-2026-0002', 'pawn_loan', 6, 2, '{"items": [{"name": "Rolex Submariner Date", "amount": 7500.00}]}', 7500.00, 0.00, 7500.00, 'cash', 'Pawn loan issued'),
('RCP-2026-0003', 'redemption', 4, 7, '{"items": [{"name": "Tiffany sterling silver cuff", "amount": 300.00}]}', 300.00, 0.00, 300.00, 'cash', 'Loan redeemed in full'),
('RCP-2026-0004', 'redemption', 7, 8, '{"items": [{"name": "Xbox Series X", "amount": 268.40}]}', 268.40, 0.00, 268.40, 'cash', 'Loan redeemed in full'),
('RCP-2026-0005', 'retail_sale', 7, NULL, '{"items": [{"name": "Samsung Galaxy S24 Ultra", "price": 749.99}]}', 749.99, 61.87, 811.86, 'cash', 'Retail sale'),
('RCP-2026-0006', 'purchase', 13, NULL, '{"items": [{"name": "DeWalt 20V MAX Combo Kit", "amount": 220.00}]}', 220.00, 0.00, 220.00, 'cash', 'Direct purchase from customer'),
('RCP-2026-0007', 'layaway_start', 8, NULL, '{"items": [{"name": "Gibson Les Paul Standard", "total": 1899.99, "down_payment": 380.00}]}', 380.00, 0.00, 380.00, 'cash', 'Layaway down payment'),
('RCP-2026-0008', 'layaway_payment', 8, NULL, '{"items": [{"name": "Gibson Les Paul Standard - Month 1", "amount": 253.33}]}', 253.33, 0.00, 253.33, 'cash', 'Layaway monthly payment'),
('RCP-2026-0009', 'interest_payment', 6, 2, '{"items": [{"name": "Interest payment - Rolex Sub", "amount": 125.00}]}', 125.00, 0.00, 125.00, 'cash', 'Monthly interest payment'),
('RCP-2026-0010', 'loan_extension', 6, 2, '{"items": [{"name": "Extension fee - Rolex Sub loan", "amount": 375.00}]}', 375.00, 0.00, 375.00, 'debit', 'Loan extension fee'),
('RCP-2026-0011', 'retail_sale', NULL, NULL, '{"items": [{"name": "Fender Blues Junior IV", "price": 599.99}]}', 599.99, 49.50, 649.49, 'credit', 'Walk-in retail sale'),
('RCP-2026-0012', 'pawn_loan', 5, 4, '{"items": [{"name": "Canon EOS R6 Mark II", "amount": 1400.00}]}', 1400.00, 0.00, 1400.00, 'cash', 'Pawn loan issued'),
('RCP-2026-0013', 'purchase', 3, NULL, '{"items": [{"name": "DJI Mavic 3 Classic", "amount": 700.00}]}', 700.00, 0.00, 700.00, 'cash', 'Direct purchase from customer'),
('RCP-2026-0014', 'retail_sale', NULL, NULL, '{"items": [{"name": "1921 Morgan Silver Dollar", "price": 89.99}]}', 89.99, 0.00, 89.99, 'cash', 'Coin sale - tax exempt'),
('RCP-2026-0015', 'layaway_start', 10, NULL, '{"items": [{"name": "Trek Marlin 7", "total": 699.99, "down_payment": 140.00}]}', 140.00, 0.00, 140.00, 'debit', 'Layaway down payment');

-- ============================================================
-- AUCTIONS (3)
-- ============================================================
INSERT INTO auctions (auction_name, auction_date, auction_type, status, notes) VALUES
('Q1 2026 Liquidation Auction', '2026-03-28', 'liquidation', 'scheduled', 'Quarterly auction for defaulted and surplus items'),
('February Electronics & Tools Clearance', '2026-02-15', 'clearance', 'completed', 'Special clearance event for older inventory'),
('Spring Estate & Collectibles Auction', '2026-04-15', 'estate', 'scheduled', 'Upcoming estate items and collectibles auction');

-- ============================================================
-- AUCTION ITEMS (15)
-- ============================================================
INSERT INTO auction_items (auction_id, inventory_id, loan_id, starting_bid, winning_bid, winner_name, status, notes) VALUES
(1, 1, NULL, 700.00, NULL, NULL, 'pending', 'MacBook Pro - reserve at cost'),
(1, 6, NULL, 300.00, NULL, NULL, 'pending', 'Fender Blues Junior IV'),
(1, 7, NULL, 180.00, NULL, NULL, 'pending', 'DeWalt combo kit'),
(1, 15, NULL, 35.00, NULL, NULL, 'pending', 'Morgan Silver Dollar'),
(1, 22, NULL, 50.00, NULL, NULL, 'pending', 'Porter-Cable compressor'),
(2, 20, NULL, 350.00, 525.00, 'Carlos Mendez', 'sold', 'Samsung Galaxy S24 Ultra - good sale'),
(2, 21, NULL, 250.00, 410.00, 'Patricia Oconnell', 'sold', 'Yamaha P-125 keyboard'),
(2, 16, NULL, 150.00, 275.00, 'Derek Lawson', 'sold', 'Titleist TSi3 Driver'),
(2, 9, 9, 600.00, 820.00, 'Frank Huerta', 'sold', 'From defaulted loan - Snap-On tool chest'),
(2, 10, 15, 1500.00, 2100.00, 'Harold Winston', 'sold', 'From defaulted loan - Martin D-28 guitar'),
(3, 4, NULL, 2500.00, NULL, NULL, 'pending', '18K Cuban link chain'),
(3, 13, NULL, 4000.00, NULL, NULL, 'pending', 'Omega Speedmaster Professional'),
(3, 14, NULL, 350.00, NULL, NULL, 'pending', 'PSA 9 Charizard - pending police clearance'),
(3, 19, NULL, 300.00, NULL, NULL, 'pending', 'David Yurman bracelet'),
(3, 25, NULL, 600.00, NULL, NULL, 'pending', 'DJI Mavic 3 Classic');

-- ============================================================
-- NOTIFICATIONS (15)
-- ============================================================
INSERT INTO notifications (customer_id, loan_id, notification_type, message, sent_via, sent_at, status) VALUES
(2, 1, 'payment_reminder', 'Your pawn loan PL-2026-0001 interest payment of $80.00 is due on 03/20/2026.', 'email', '2026-03-15 09:00:00', 'sent'),
(6, 2, 'extension_confirmation', 'Your loan PL-2026-0002 has been extended to 06/05/2026. Extension fee of $375.00 was applied.', 'email', '2026-03-03 10:00:00', 'sent'),
(15, 3, 'payment_reminder', 'Your pawn loan PL-2026-0003 interest payment of $28.00 is due on 02/22/2026.', 'sms', '2026-02-17 09:00:00', 'sent'),
(5, 4, 'loan_created', 'Your pawn loan PL-2026-0004 for $1,400.00 has been created. Maturity date: 04/22/2026.', 'email', '2026-01-22 11:00:00', 'sent'),
(1, 6, 'default_notice', 'NOTICE: Your pawn loan PL-2026-0006 has defaulted. The collateral item has been forfeited.', 'email', '2026-02-16 09:00:00', 'sent'),
(1, 6, 'default_notice', 'NOTICE: Your pawn loan PL-2026-0006 has defaulted. The collateral item has been forfeited.', 'mail', NULL, 'pending'),
(14, 12, 'grace_period', 'Your loan PL-2026-0012 has entered a grace period. Please redeem by 04/05/2026 to avoid forfeiture.', 'email', '2026-03-20 09:00:00', 'sent'),
(14, 12, 'grace_period', 'Your loan PL-2026-0012 has entered a grace period. Please redeem by 04/05/2026 to avoid forfeiture.', 'sms', '2026-03-20 09:01:00', 'sent'),
(8, NULL, 'layaway_reminder', 'Your layaway payment of $253.33 for Gibson Les Paul Standard is due on 03/18/2026.', 'email', '2026-03-13 09:00:00', 'sent'),
(10, NULL, 'layaway_reminder', 'Your layaway payment of $93.33 for Trek Marlin 7 is due on 03/18/2026.', 'sms', '2026-03-13 09:00:00', 'sent'),
(4, NULL, 'layaway_default', 'NOTICE: Your layaway for 18K Gold Cuban Link Chain has been defaulted due to missed payments.', 'email', '2026-03-15 09:00:00', 'sent'),
(4, NULL, 'layaway_default', 'NOTICE: Your layaway for 18K Gold Cuban Link Chain has been defaulted due to missed payments.', 'mail', NULL, 'pending'),
(17, 18, 'extension_confirmation', 'Your loan PL-2026-0018 has been extended to 04/15/2026.', 'email', '2026-02-13 14:00:00', 'sent'),
(3, 11, 'payment_reminder', 'Your pawn loan PL-2026-0011 interest payment of $11.00 is due on 03/10/2026.', 'email', '2026-03-05 09:00:00', 'sent'),
(16, 13, 'loan_created', 'Your pawn loan PL-2026-0013 for $350.00 has been created. Maturity date: 05/08/2026.', 'email', '2026-02-08 11:00:00', 'sent');
