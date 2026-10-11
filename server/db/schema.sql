CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(15) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer','technician','admin')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE technicians (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  shop_name VARCHAR(100),
  skills TEXT,
  address TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  service_radius_km INT DEFAULT 10,
  avg_rating DECIMAL(2,1) DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE repair_requests (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES users(id) ON DELETE CASCADE,
  device_category VARCHAR(30) NOT NULL,
  brand VARCHAR(50),
  model VARCHAR(50),
  problem TEXT NOT NULL,
  budget DECIMAL(10,2),
  service_type VARCHAR(20) DEFAULT 'pickup',
  image_url TEXT,
  ml_prediction VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quotations (
  id SERIAL PRIMARY KEY,
  request_id INT REFERENCES repair_requests(id) ON DELETE CASCADE,
  technician_id INT REFERENCES technicians(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  estimated_days INT,
  note TEXT,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  quotation_id INT UNIQUE REFERENCES quotations(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE status_updates (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INT UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id INT REFERENCES users(id),
  technician_id INT REFERENCES technicians(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE post_reactions (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(7) CHECK (type IN ('like','dislike')),
  UNIQUE (post_id, user_id)
);

CREATE TABLE tutorials (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  device_category VARCHAR(30),
  youtube_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  booking_id INT UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW()
);
