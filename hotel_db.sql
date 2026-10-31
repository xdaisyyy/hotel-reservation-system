DROP TABLE IF EXISTS room_reservations CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'client'
);

CREATE TABLE venues (
    venue_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    inclusions TEXT,
    capacity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE rooms (
    room_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    inclusions TEXT,
    capacity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    venue_id INT REFERENCES venues(venue_id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_time VARCHAR(50),
    guest_count INT NOT NULL,
    extra_hours INT DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_reservations (
    room_res_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    room_id INT REFERENCES rooms(room_id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    check_in_time VARCHAR(50),
    check_out_time VARCHAR(50),
    guest_count INT NOT NULL,
    extra_hours INT DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    client_name VARCHAR(100),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO venues (name, description, inclusions, capacity, price) VALUES 
('Garden Oasis', 'A lush garden setting surrounded by greenery and blooming flowers. Perfect for romantic weddings and elegant debuts.', 'Floral centerpieces, Rustic wooden chairs, Basic sound system, 50 white monobloc chairs', 250, 45000.00),
('Grand Ballroom', 'Our grand ballroom is the epitome of elegance. Fully air-conditioned with high ceilings and crystal chandeliers.', 'Crystal chandeliers, Round banquet tables, 100 chiavari chairs, Stage & LED wall, Premium sound system', 500, 75000.00),
('Coastal Retreat', 'Experience the magic of celebrating by the sea. Breathtaking open-air setting with natural ocean breeze and sunset views.', 'Beachfront setup, Tiki torches, Bonfire area, Buffet tables, Basic sound system', 300, 55000.00);

INSERT INTO rooms (name, description, inclusions, capacity, price) VALUES 
('Standard Room', 'A cozy and comfortable room perfect for solo travelers or couples looking for a quick getaway.', 'Smart TV, Queen bed, Air conditioning, Wi-Fi, Complimentary breakfast', 2, 3500.00),
('Family Deluxe', 'Spacious and elegant, designed for families to relax and bond after a long day of exploring.', 'Smart TV, Two Queen beds, Sofa bed, Mini-fridge, Bathtub, Wi-Fi, Breakfast for 4', 6, 6500.00),
('Presidential Suite', 'The pinnacle of luxury. Experience breathtaking views, a private lounge, and world-class amenities.', 'Smart TV, King bed, Private living room, Jacuzzi, Butler service, Lounge access, Full breakfast', 6, 15000.00);

INSERT INTO reviews (client_name, rating, comment) VALUES 
('Maria Clara', 5, 'Absolutely magical! The Grand Ballroom was stunning and the staff were incredibly accommodating.'),
('Juan Dela Cruz', 4, 'Had our family reunion at the Garden Oasis. Beautiful setup, though parking was a bit tight.'),
('Simone Reyes', 5, 'The Coastal Retreat sunset view is unmatched. Best decision we made for our wedding!');

UPDATE users SET role = 'admin' WHERE email = 'admin@gala.com';