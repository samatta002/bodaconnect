CREATE TABLE IF NOT EXISTS drivers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  phone      VARCHAR(30),
  password   VARCHAR(255) NOT NULL,
  plate      VARCHAR(50),
  nida       VARCHAR(50),
  status     ENUM('available','on_trip','offline') DEFAULT 'available',
  rating     DECIMAL(3,2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rides (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  pickup      VARCHAR(255) NOT NULL,
  destination VARCHAR(255),
  status      ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
  driver_id   INT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
