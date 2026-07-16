CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE, 
    email VARCHAR(100) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id varchar(128) COLLATE utf8mb4_bin NOT NULL,
    expires int(11) unsigned NOT NULL,
    data mediumtext COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS literature (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL, 
    writer_id INT,
    Genre VARCHAR(100) NOT NULL, 
    Summary TEXT NOT NULL, 
    pdf_url VARCHAR(512) DEFAULT 'uploads/default.pdf', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (writer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS votes ( 
    users_id INT NOT NULL,
    literature_id INT NOT NULL, 
    vote_type ENUM('like', 'dislike') NOT NULL,
    PRIMARY KEY (users_id, literature_id), 
    FOREIGN KEY (users_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (literature_id) REFERENCES literature(id) ON DELETE CASCADE
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
