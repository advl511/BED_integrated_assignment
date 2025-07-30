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

-- Create Polyclinics Table
CREATE TABLE Polyclinics (
    PolyclinicID INT IDENTITY(1,1) PRIMARY KEY,
    PolyclinicCode NVARCHAR(50) NOT NULL UNIQUE,
    PolyclinicName NVARCHAR(100) NOT NULL,
    Address NVARCHAR(255),
    ContactNumber NVARCHAR(20),
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Create Doctors Table
CREATE TABLE Doctors (
    DoctorID INT IDENTITY(1,1) PRIMARY KEY,
    DoctorName NVARCHAR(100) NOT NULL,
    PolyclinicID INT NOT NULL,
    Specialization NVARCHAR(100) DEFAULT 'General Practice',
    LicenseNumber NVARCHAR(50),
    ContactNumber NVARCHAR(20),
    Email NVARCHAR(100),
    IsAvailable BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PolyclinicID) REFERENCES Polyclinics(PolyclinicID)
);

-- Insert Polyclinics Data
INSERT INTO Polyclinics (PolyclinicCode, PolyclinicName, Address, ContactNumber) VALUES
('ang_mo_kio', 'Ang Mo Kio Polyclinic', '21 Ang Mo Kio Central 2, Singapore 569666', '6355 3000'),
('bedok', 'Bedok Polyclinic', '11 Bedok North Street 1, Singapore 469662', '6244 5612'),
('bukit_batok', 'Bukit Batok Polyclinic', '50 Bukit Batok West Avenue 3, Singapore 659164', '6665 4088'),
('bukit_merah', 'Bukit Merah Polyclinic', '162 Bukit Merah Central, Singapore 150162', '6377 9594'),
('choa_chu_kang', 'Choa Chu Kang Polyclinic', '2 Teck Whye Crescent, Singapore 688846', '6769 9355'),
('clementi', 'Clementi Polyclinic', '451 Clementi Avenue 3, Singapore 120451', '6774 4122'),
('geylang', 'Geylang Polyclinic', '21 Geylang East Central, Singapore 389707', '6746 7344'),
('hougang', 'Hougang Polyclinic', '89 Hougang Avenue 4, Singapore 538829', '6387 8044'),
('jurong', 'Jurong Polyclinic', '190 Jurong East Avenue 1, Singapore 609788', '6665 5488'),
('kallang', 'Kallang Polyclinic', '1 Geylang Bahru, Singapore 339694', '6293 4188'),
('marine_parade', 'Marine Parade Polyclinic', '80 Marine Parade Central, Singapore 440080', '6344 6622'),
('outram', 'Outram Polyclinic', '3 Second Hospital Avenue, Singapore 168937', '6321 4377'),
('pasir_ris', 'Pasir Ris Polyclinic', '1 Pasir Ris Drive 4, Singapore 519457', '6585 9000'),
('pioneer', 'Pioneer Polyclinic', '26 Jurong West Street 61, Singapore 648201', '6316 6765'),
('punggol', 'Punggol Polyclinic', '681 Punggol Drive, Singapore 820681', '6318 6488'),
('queenstown', 'Queenstown Polyclinic', '580 Stirling Road, Singapore 148958', '6473 2957'),
('sengkang', 'Sengkang Polyclinic', '2 Sengkang Square, Singapore 545025', '6388 7400'),
('tampines', 'Tampines Polyclinic', '1 Tampines Street 41, Singapore 529203', '6783 0033'),
('toa_payoh', 'Toa Payoh Polyclinic', '2003 Lorong 8 Toa Payoh, Singapore 319260', '6252 8833'),
('woodlands', 'Woodlands Polyclinic', '10 Woodlands Street 31, Singapore 738579', '6363 4488'),
('yishun', 'Yishun Polyclinic', '2 Yishun Central 2, Singapore 768024', '6753 7155');

-- Insert Doctors Data
-- Ang Mo Kio Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Lim Wei Ming', 1, 'General Practice', 'SMC001001', 'lim.weiming@singhealth.com.sg'),
('Dr. Sarah Tan', 1, 'Family Medicine', 'SMC001002', 'sarah.tan@singhealth.com.sg'),
('Dr. Kumar Raj', 1, 'Internal Medicine', 'SMC001003', 'kumar.raj@singhealth.com.sg'),
('Dr. Michelle Wong', 1, 'General Practice', 'SMC001004', 'michelle.wong@singhealth.com.sg');

-- Bedok Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Chen Li Hua', 2, 'General Practice', 'SMC002001', 'chen.lihua@singhealth.com.sg'),
('Dr. Rajesh Kumar', 2, 'Family Medicine', 'SMC002002', 'rajesh.kumar@singhealth.com.sg'),
('Dr. Amanda Lim', 2, 'Internal Medicine', 'SMC002003', 'amanda.lim@singhealth.com.sg'),
('Dr. David Ng', 2, 'General Practice', 'SMC002004', 'david.ng@singhealth.com.sg');

-- Bukit Batok Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Priya Sharma', 3, 'General Practice', 'SMC003001', 'priya.sharma@singhealth.com.sg'),
('Dr. Jason Lee', 3, 'Family Medicine', 'SMC003002', 'jason.lee@singhealth.com.sg'),
('Dr. Melissa Tay', 3, 'Internal Medicine', 'SMC003003', 'melissa.tay@singhealth.com.sg'),
('Dr. Arjun Patel', 3, 'General Practice', 'SMC003004', 'arjun.patel@singhealth.com.sg');

-- Bukit Merah Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Siti Rahman', 4, 'General Practice', 'SMC004001', 'siti.rahman@singhealth.com.sg'),
('Dr. Marcus Tan', 4, 'Family Medicine', 'SMC004002', 'marcus.tan@singhealth.com.sg'),
('Dr. Grace Koh', 4, 'Internal Medicine', 'SMC004003', 'grace.koh@singhealth.com.sg'),
('Dr. Vikram Singh', 4, 'General Practice', 'SMC004004', 'vikram.singh@singhealth.com.sg');

-- Choa Chu Kang Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Elizabeth Wong', 5, 'General Practice', 'SMC005001', 'elizabeth.wong@singhealth.com.sg'),
('Dr. Rahman Ali', 5, 'Family Medicine', 'SMC005002', 'rahman.ali@singhealth.com.sg'),
('Dr. Crystal Lim', 5, 'Internal Medicine', 'SMC005003', 'crystal.lim@singhealth.com.sg'),
('Dr. Suresh Nair', 5, 'General Practice', 'SMC005004', 'suresh.nair@singhealth.com.sg');

-- Clementi Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Jennifer Tan', 6, 'General Practice', 'SMC006001', 'jennifer.tan@singhealth.com.sg'),
('Dr. Mohammed Hassan', 6, 'Family Medicine', 'SMC006002', 'mohammed.hassan@singhealth.com.sg'),
('Dr. Stephanie Koh', 6, 'Internal Medicine', 'SMC006003', 'stephanie.koh@singhealth.com.sg'),
('Dr. Ravi Menon', 6, 'General Practice', 'SMC006004', 'ravi.menon@singhealth.com.sg');

-- Geylang Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Aishah Begum', 7, 'General Practice', 'SMC007001', 'aishah.begum@singhealth.com.sg'),
('Dr. Kenneth Lim', 7, 'Family Medicine', 'SMC007002', 'kenneth.lim@singhealth.com.sg'),
('Dr. Priscilla Ng', 7, 'Internal Medicine', 'SMC007003', 'priscilla.ng@singhealth.com.sg'),
('Dr. Deepak Sharma', 7, 'General Practice', 'SMC007004', 'deepak.sharma@singhealth.com.sg');

-- Hougang Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Sonia Patel', 8, 'General Practice', 'SMC008001', 'sonia.patel@singhealth.com.sg'),
('Dr. William Teo', 8, 'Family Medicine', 'SMC008002', 'william.teo@singhealth.com.sg'),
('Dr. Jasmine Tan', 8, 'Internal Medicine', 'SMC008003', 'jasmine.tan@singhealth.com.sg'),
('Dr. Ashwin Kumar', 8, 'General Practice', 'SMC008004', 'ashwin.kumar@singhealth.com.sg');

-- Jurong Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Fatima Abdullah', 9, 'General Practice', 'SMC009001', 'fatima.abdullah@singhealth.com.sg'),
('Dr. Daniel Wong', 9, 'Family Medicine', 'SMC009002', 'daniel.wong@singhealth.com.sg'),
('Dr. Cheryl Lim', 9, 'Internal Medicine', 'SMC009003', 'cheryl.lim@singhealth.com.sg'),
('Dr. Naveen Raj', 9, 'General Practice', 'SMC009004', 'naveen.raj@singhealth.com.sg');

-- Kallang Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Vanessa Koh', 10, 'General Practice', 'SMC010001', 'vanessa.koh@singhealth.com.sg'),
('Dr. Ahmad Rizwan', 10, 'Family Medicine', 'SMC010002', 'ahmad.rizwan@singhealth.com.sg'),
('Dr. Helen Ng', 10, 'Internal Medicine', 'SMC010003', 'helen.ng@singhealth.com.sg'),
('Dr. Karthik Reddy', 10, 'General Practice', 'SMC010004', 'karthik.reddy@singhealth.com.sg');

-- Marine Parade Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Rukmini Devi', 11, 'General Practice', 'SMC011001', 'rukmini.devi@singhealth.com.sg'),
('Dr. Steven Tan', 11, 'Family Medicine', 'SMC011002', 'steven.tan@singhealth.com.sg'),
('Dr. Angeline Lim', 11, 'Internal Medicine', 'SMC011003', 'angeline.lim@singhealth.com.sg'),
('Dr. Mohit Gupta', 11, 'General Practice', 'SMC011004', 'mohit.gupta@singhealth.com.sg');

-- Outram Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Nisha Patel', 12, 'General Practice', 'SMC012001', 'nisha.patel@singhealth.com.sg'),
('Dr. Jonathan Lee', 12, 'Family Medicine', 'SMC012002', 'jonathan.lee@singhealth.com.sg'),
('Dr. Serena Wong', 12, 'Internal Medicine', 'SMC012003', 'serena.wong@singhealth.com.sg'),
('Dr. Ramesh Iyer', 12, 'General Practice', 'SMC012004', 'ramesh.iyer@singhealth.com.sg');

-- Pasir Ris Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Farah Johari', 13, 'General Practice', 'SMC013001', 'farah.johari@singhealth.com.sg'),
('Dr. Benjamin Koh', 13, 'Family Medicine', 'SMC013002', 'benjamin.koh@singhealth.com.sg'),
('Dr. Evelyn Tan', 13, 'Internal Medicine', 'SMC013003', 'evelyn.tan@singhealth.com.sg'),
('Dr. Anil Kapoor', 13, 'General Practice', 'SMC013004', 'anil.kapoor@singhealth.com.sg');

-- Pioneer Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Meera Nair', 14, 'General Practice', 'SMC014001', 'meera.nair@singhealth.com.sg'),
('Dr. Calvin Ng', 14, 'Family Medicine', 'SMC014002', 'calvin.ng@singhealth.com.sg'),
('Dr. Natalie Lim', 14, 'Internal Medicine', 'SMC014003', 'natalie.lim@singhealth.com.sg'),
('Dr. Sandeep Gupta', 14, 'General Practice', 'SMC014004', 'sandeep.gupta@singhealth.com.sg');

-- Punggol Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Rashida Khan', 15, 'General Practice', 'SMC015001', 'rashida.khan@singhealth.com.sg'),
('Dr. Ethan Tay', 15, 'Family Medicine', 'SMC015002', 'ethan.tay@singhealth.com.sg'),
('Dr. Denise Wong', 15, 'Internal Medicine', 'SMC015003', 'denise.wong@singhealth.com.sg'),
('Dr. Manish Jain', 15, 'General Practice', 'SMC015004', 'manish.jain@singhealth.com.sg');

-- Queenstown Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Kavitha Murali', 16, 'General Practice', 'SMC016001', 'kavitha.murali@singhealth.com.sg'),
('Dr. Ryan Lim', 16, 'Family Medicine', 'SMC016002', 'ryan.lim@singhealth.com.sg'),
('Dr. Fiona Tan', 16, 'Internal Medicine', 'SMC016003', 'fiona.tan@singhealth.com.sg'),
('Dr. Ajay Krishnan', 16, 'General Practice', 'SMC016004', 'ajay.krishnan@singhealth.com.sg');

-- Sengkang Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Zara Ahmed', 17, 'General Practice', 'SMC017001', 'zara.ahmed@singhealth.com.sg'),
('Dr. Nicholas Koh', 17, 'Family Medicine', 'SMC017002', 'nicholas.koh@singhealth.com.sg'),
('Dr. Brenda Ng', 17, 'Internal Medicine', 'SMC017003', 'brenda.ng@singhealth.com.sg'),
('Dr. Rohit Sharma', 17, 'General Practice', 'SMC017004', 'rohit.sharma@singhealth.com.sg');

-- Tampines Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Leela Krishnan', 18, 'General Practice', 'SMC018001', 'leela.krishnan@singhealth.com.sg'),
('Dr. Matthew Wong', 18, 'Family Medicine', 'SMC018002', 'matthew.wong@singhealth.com.sg'),
('Dr. Valerie Lim', 18, 'Internal Medicine', 'SMC018003', 'valerie.lim@singhealth.com.sg'),
('Dr. Sanjay Patel', 18, 'General Practice', 'SMC018004', 'sanjay.patel@singhealth.com.sg');

-- Toa Payoh Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Indira Devi', 19, 'General Practice', 'SMC019001', 'indira.devi@singhealth.com.sg'),
('Dr. Samuel Tan', 19, 'Family Medicine', 'SMC019002', 'samuel.tan@singhealth.com.sg'),
('Dr. Rachel Koh', 19, 'Internal Medicine', 'SMC019003', 'rachel.koh@singhealth.com.sg'),
('Dr. Vivek Menon', 19, 'General Practice', 'SMC019004', 'vivek.menon@singhealth.com.sg');

-- Woodlands Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Habiba Rahman', 20, 'General Practice', 'SMC020001', 'habiba.rahman@singhealth.com.sg'),
('Dr. Gabriel Lim', 20, 'Family Medicine', 'SMC020002', 'gabriel.lim@singhealth.com.sg'),
('Dr. Joanna Ng', 20, 'Internal Medicine', 'SMC020003', 'joanna.ng@singhealth.com.sg'),
('Dr. Arpit Agarwal', 20, 'General Practice', 'SMC020004', 'arpit.agarwal@singhealth.com.sg');

-- Yishun Polyclinic Doctors
INSERT INTO Doctors (DoctorName, PolyclinicID, Specialization, LicenseNumber, Email) VALUES
('Dr. Kamala Suri', 21, 'General Practice', 'SMC021001', 'kamala.suri@singhealth.com.sg'),
('Dr. Darren Teo', 21, 'Family Medicine', 'SMC021002', 'darren.teo@singhealth.com.sg'),
('Dr. Chloe Wong', 21, 'Internal Medicine', 'SMC021003', 'chloe.wong@singhealth.com.sg'),
('Dr. Nitin Joshi', 21, 'General Practice', 'SMC021004', 'nitin.joshi@singhealth.com.sg');

-- Create Appointments Table (for storing appointment bookings)
CREATE TABLE Appointments (
    AppointmentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL, -- Assuming you have a Users table
    PolyclinicID INT NOT NULL,
    DoctorID INT NOT NULL,
    AppointmentDate DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    Reason NVARCHAR(500) NOT NULL,
    BookingReference NVARCHAR(50) NOT NULL UNIQUE,
    Status NVARCHAR(20) DEFAULT 'Confirmed',
    CreatedDate DATETIME2 DEFAULT GETDATE(),
    ModifiedDate DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PolyclinicID) REFERENCES Polyclinics(PolyclinicID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);

-- Create indexes for better performance
CREATE INDEX IX_Appointments_UserID ON Appointments(UserID);
CREATE INDEX IX_Appointments_PolyclinicID ON Appointments(PolyclinicID);
CREATE INDEX IX_Appointments_DoctorID ON Appointments(DoctorID);
CREATE INDEX IX_Appointments_AppointmentDate ON Appointments(AppointmentDate);
CREATE INDEX IX_Appointments_BookingReference ON Appointments(BookingReference);
CREATE INDEX IX_Doctors_PolyclinicID ON Doctors(PolyclinicID);

-- Sample query to get doctors for a specific polyclinic
-- SELECT d.DoctorName, d.Specialization, p.PolyclinicName 
-- FROM Doctors d 
-- JOIN Polyclinics p ON d.PolyclinicID = p.PolyclinicID 
-- WHERE p.PolyclinicCode = 'ang_mo_kio' AND d.IsAvailable = 1;

-- Sample query to insert a new appointment
-- INSERT INTO Appointments (UserID, PolyclinicID, DoctorID, AppointmentDate, AppointmentTime, Reason, BookingReference)
-- VALUES (1, 1, 1, '2024-01-15', '09:00:00', 'General checkup', 'APT-ABC123');