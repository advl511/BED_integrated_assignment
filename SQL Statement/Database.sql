CREATE DATABASE user_management_system;
GO

USE user_management_system;
GO
CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL, -- Hashed password (never store plain text!)
    salt NVARCHAR(32) NOT NULL, -- Salt for password hashing
    phone_number NVARCHAR(20) NOT NULL,
    race NVARCHAR(50) NOT NULL,
    age INT NOT NULL CHECK (age >= 0 AND age <= 150),
    first_name NVARCHAR(50) NOT NULL,
    last_name NVARCHAR(50) NOT NULL,
    gender NVARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    date_of_birth DATE NOT NULL,
    nationality NVARCHAR(50) NOT NULL,
    preferred_language NVARCHAR(20) DEFAULT 'English',
    account_status NVARCHAR(20) DEFAULT 'Pending' CHECK (account_status IN ('Active', 'Inactive', 'Suspended', 'Pending')),
    email_verified BIT DEFAULT 0,
    phone_verified BIT DEFAULT 0,
    profile_picture_url NVARCHAR(255),
    timezone NVARCHAR(50) DEFAULT 'UTC',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2 NULL,
    failed_login_attempts INT DEFAULT 0,
    account_locked_until DATETIME2 NULL
);
GO

-- Create indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at);
GO

-- Create trigger for updated_at column
CREATE TRIGGER trg_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE users 
    SET updated_at = GETDATE() 
    WHERE user_id IN (SELECT user_id FROM inserted);
END;
GO

-- ===============================
-- TABLE: user_addresses
-- ===============================
CREATE TABLE user_addresses (
    address_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    address_type NVARCHAR(20) NOT NULL CHECK (address_type IN ('Home', 'Work', 'Mailing', 'Other')),
    street_address NVARCHAR(255) NOT NULL,
    city NVARCHAR(100) NOT NULL,
    state_province NVARCHAR(100),
    postal_code NVARCHAR(20) NOT NULL,
    country NVARCHAR(100) NOT NULL,
    is_primary BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- Create indexes for user_addresses table
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_address_type ON user_addresses(address_type);
GO

-- Create trigger for updated_at column
CREATE TRIGGER trg_user_addresses_updated_at
ON user_addresses
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE user_addresses 
    SET updated_at = GETDATE() 
    WHERE address_id IN (SELECT address_id FROM inserted);
END;
GO

-- ===============================
-- TABLE: user_preferences
-- ===============================
CREATE TABLE user_preferences (
    preference_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    notification_email BIT DEFAULT 1,
    notification_sms BIT DEFAULT 1,
    notification_push BIT DEFAULT 1,
    newsletter_subscription BIT DEFAULT 0,
    privacy_setting NVARCHAR(20) DEFAULT 'Private' CHECK (privacy_setting IN ('Public', 'Friends', 'Private')),
    two_factor_enabled BIT DEFAULT 0,
    preferred_contact_method NVARCHAR(20) DEFAULT 'Email' CHECK (preferred_contact_method IN ('Email', 'Phone', 'SMS')),
    theme_preference NVARCHAR(20) DEFAULT 'Auto' CHECK (theme_preference IN ('Light', 'Dark', 'Auto')),
    font_size NVARCHAR(20) DEFAULT 'Medium' CHECK (font_size IN ('Small', 'Medium', 'Large', 'Extra Large')),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- Create index for user_preferences table
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
GO

-- Create trigger for updated_at column
CREATE TRIGGER trg_user_preferences_updated_at
ON user_preferences
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE user_preferences 
    SET updated_at = GETDATE() 
    WHERE preference_id IN (SELECT preference_id FROM inserted);
END;
GO

-- ===============================
-- TABLE: user_sessions (for session management)
-- ===============================
CREATE TABLE user_sessions (
    session_id NVARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address NVARCHAR(45) NOT NULL,
    user_agent NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    expires_at DATETIME2 NOT NULL,
    is_active BIT DEFAULT 1,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- Create indexes for user_sessions table
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
GO

-- ===============================
-- TABLE: password_reset_tokens
-- ===============================
CREATE TABLE password_reset_tokens (
    token_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token NVARCHAR(255) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    used BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- Create indexes for password_reset_tokens table
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
GO

-- ===============================
-- TABLE: audit_log (for security tracking)
-- ===============================
CREATE TABLE audit_log (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT,
    action_type NVARCHAR(50) NOT NULL CHECK (action_type IN ('Login', 'Logout', 'Password_Change', 'Profile_Update', 'Account_Lock', 'Account_Unlock')),
    ip_address NVARCHAR(45),
    user_agent NVARCHAR(MAX),
    success BIT NOT NULL,
    details NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);
GO

-- Create indexes for audit_log table
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
GO

-- ===============================
-- TABLE: appointments (MSSQL version)
-- ===============================
CREATE TABLE appointments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    date DATE NOT NULL,
    type NVARCHAR(100) NOT NULL,
    time NVARCHAR(20) NOT NULL,
    doctor NVARCHAR(100) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Create indexes for appointments table
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_doctor ON appointments(doctor);
CREATE INDEX idx_appointments_status ON appointments(status);
GO

-- Trigger for updated_at column
CREATE TRIGGER trg_appointments_updated_at
ON appointments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE appointments 
    SET updated_at = GETDATE() 
    WHERE id IN (SELECT id FROM inserted);
END;
GO
CREATE TABLE UserSettings (
    userId NVARCHAR(50) PRIMARY KEY,
    showPrayerTimes BIT NOT NULL,
    fontSize NVARCHAR(20) NOT NULL,
    location NVARCHAR(50) NOT NULL
);
-- ===============================
-- INSERT SAMPLE DATA (MSSQL syntax)
-- ===============================
INSERT INTO appointments (date, type, time, doctor, status) VALUES
('2025-10-01', 'Consultation', '09:00', 'Dr. Smith', 'Scheduled'),
('2025-10-02', 'Check-up', '10:00', 'Dr. Adams', 'Completed'),
('2025-10-03', 'Vaccination', '11:00', 'Dr. Lee', 'Cancelled'),
('2025-10-04', 'Dental', '14:00', 'Dr. Wong', 'No-show'),
('2025-10-05', 'Physiotherapy', '15:00', 'Dr. Tan', 'Rescheduled');
GO

