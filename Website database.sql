CREATE DATABASE IF NOT EXISTS my_databaseplatform;
USE my_databaseplatform;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL, 
    email VARCHAR(50) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL,
    
    role ENUM('writer', 'reader') DEFAULT 'reader',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--INSERT INTO users (id, username, email, password_hash) VALUES 
  --(1, 'john_doe', 'john.doe@example.com', 'hashed_password_1'),
  --(2, 'jane_smith', 'jane.smith@example.com', 'hashed_password_2');

CREATE TABLE IF NOT EXISTS literature (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(60) NOT NULL,
    writer_id INT,
    Genre ENUM('Poetry', 'Drama', 'Novel', 'Short story', 'Essay', 'Fiction', 'Theatre') NOT NULL,
    publication_date DATE,
    Summary VARCHAR(500) NOT NULL, 
    pdf_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (writer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS votes ( 
    id INT AUTO_INCREMENT PRIMARY KEY,
    users_id INT,
    literature_id INT, 
    FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (literature_id) REFERENCES literature(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reader_vote (users_id, literature_id)
);

CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    badge_name VARCHAR(50) NOT NULL UNIQUE,
    badge_icon_url VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id INT,
    badge_id INT,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);