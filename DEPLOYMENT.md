# LiCafe - Deployment Guide for PublicVM

## Prerequisites
- Node.js 18+ installed
- MySQL database set up on PublicVM
- Nginx installed and running
- SSL certificate (Let's Encrypt recommended)

## Deployment Steps

### 1. Update `.env` file
Replace the placeholder values with your PublicVM credentials:
```bash
MYSQL_HOST=your_publicvm_mysql_host
MYSQL_USER=your_database_user
MYSQL_PASSWORD=your_database_password
MYSQL_DATABASE=my_databaseplatform
PORT=3000
SESSION_SECRET=your_secure_random_string
NODE_ENV=production
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up database
```bash
mysql -h your_host -u your_user -p < "Website database.sql"
```

### 4. Configure Nginx
Copy the `nginx.conf` to your nginx sites-available:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/licafe
sudo ln -s /etc/nginx/sites-available/licafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Set up SSL with Let's Encrypt
```bash
sudo certbot certonly --nginx -d licafe.publicvm.com -d www.licafe.publicvm.com
```

Update the SSL paths in nginx.conf:
```
ssl_certificate /etc/letsencrypt/live/licafe.publicvm.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/licafe.publicvm.com/privkey.pem;
```

### 6. Set up systemd service (auto-restart)
```bash
sudo cp licafe.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable licafe
sudo systemctl start licafe
```

### 7. Test the deployment
```bash
curl https://www.licafe.publicvm.com/api/health
```

## Troubleshooting
- Check logs: `sudo journalctl -u licafe -f`
- Check Nginx: `sudo tail -f /var/log/nginx/error.log`
- Check port: `sudo lsof -i :3000`

## Environment Variables
- `MYSQL_HOST`: Your MySQL server address
- `MYSQL_USER`: Database username
- `MYSQL_PASSWORD`: Database password
- `MYSQL_DATABASE`: Database name
- `PORT`: Node.js server port (default: 3000)
- `SESSION_SECRET`: Secure random string for sessions
- `NODE_ENV`: Set to 'production'
