CREATE TABLE IF NOT EXISTS drivers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  phone      VARCHAR(30),
  password   VARCHAR(255) NOT NULL,
  plate      VARCHAR(50),
  nida       VARCHAR(50),
  photo_url  LONGTEXT,
  status     ENUM('available','on_trip','offline') DEFAULT 'available',
  rating     DECIMAL(3,2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rides (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  passenger_name  VARCHAR(255),
  passenger_phone VARCHAR(30),
  pickup      VARCHAR(255) NOT NULL,
  destination VARCHAR(255),
  pickup_lat  DECIMAL(10,6),
  pickup_lng  DECIMAL(10,6),
  destination_lat DECIMAL(10,6),
  destination_lng DECIMAL(10,6),
  status      ENUM('pending','accepted','active','completed','cancelled') DEFAULT 'pending',
  driver_id   INT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ride_reviews (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ride_id    INT NOT NULL UNIQUE,
  driver_id  INT NOT NULL,
  rating     INT NOT NULL,
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_ride FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);
