-- If "users" already exists from your username check, \d users first
-- and add any missing columns instead of recreating it.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE,
  phone VARCHAR(20),
  password_hash TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer','technician','admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS technicians (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skills TEXT[],
  service_area VARCHAR(120),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  rating_avg NUMERIC(3,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  brand VARCHAR(60),
  model VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS repair_requests (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES users(id),
  device_id INT REFERENCES devices(id),
  description TEXT NOT NULL,
  photo_url TEXT,
  predicted_category VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  technician_id INT NOT NULL REFERENCES technicians(id),
  amount NUMERIC(10,2) NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  quotation_id INT UNIQUE NOT NULL REFERENCES quotations(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'booked'
);

CREATE TABLE IF NOT EXISTS repair_status_updates (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  booking_id INT UNIQUE NOT NULL REFERENCES bookings(id),
  customer_id INT NOT NULL REFERENCES users(id),
  technician_id INT NOT NULL REFERENCES technicians(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS tutorials (
  id SERIAL PRIMARY KEY,
  author_id INT NOT NULL REFERENCES users(id),
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  booking_id INT UNIQUE NOT NULL REFERENCES bookings(id),
  total NUMERIC(10,2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
