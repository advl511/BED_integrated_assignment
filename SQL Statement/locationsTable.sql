-- Drop tables if they already exist (for clean re-run)
IF OBJECT_ID('dbo.user_saved_locations', 'U') IS NOT NULL DROP TABLE dbo.user_saved_locations;
IF OBJECT_ID('dbo.user_routes', 'U') IS NOT NULL DROP TABLE dbo.user_routes;
GO

-- ===============================
-- TABLE: user_saved_locations
-- ===============================
CREATE TABLE user_saved_locations (
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    location_name NVARCHAR(100) NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (user_id, location_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- TRIGGER: Auto-increment location_id per user
DROP TRIGGER IF EXISTS trg_auto_increment_location_id;
GO

CREATE TRIGGER trg_auto_increment_location_id
ON user_saved_locations
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @user_id INT, @location_name NVARCHAR(100),
            @lat DECIMAL(9,6), @lng DECIMAL(9,6);

    DECLARE insert_cursor CURSOR FOR
        SELECT user_id, location_name, latitude, longitude FROM inserted;

    OPEN insert_cursor;
    FETCH NEXT FROM insert_cursor INTO @user_id, @location_name, @lat, @lng;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @next_id INT;
        SELECT @next_id = MAX(location_id) + 1 FROM user_saved_locations WHERE user_id = @user_id;
        IF @next_id IS NULL SET @next_id = 1;

        INSERT INTO user_saved_locations (
            user_id, location_id, location_name, latitude, longitude, created_at, updated_at
        ) VALUES (
            @user_id, @next_id, @location_name, @lat, @lng, GETDATE(), GETDATE()
        );

        FETCH NEXT FROM insert_cursor INTO @user_id, @location_name, @lat, @lng;
    END

    CLOSE insert_cursor;
    DEALLOCATE insert_cursor;
END;
GO

-- ===============================
-- TABLE: user_routes
-- ===============================
CREATE TABLE user_routes (
    user_id INT NOT NULL,
    route_id INT NOT NULL,
    route_name NVARCHAR(100) NOT NULL,
    start_lat DECIMAL(9,6) NOT NULL,
    start_lng DECIMAL(9,6) NOT NULL,
    end_lat DECIMAL(9,6) NOT NULL,
    end_lng DECIMAL(9,6) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (user_id, route_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- TRIGGER: Auto-increment route_id per user
DROP TRIGGER IF EXISTS trg_auto_increment_route_id;
GO

CREATE TRIGGER trg_auto_increment_route_id
ON user_routes
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @user_id INT, @route_name NVARCHAR(100),
            @start_lat DECIMAL(9,6), @start_lng DECIMAL(9,6),
            @end_lat DECIMAL(9,6), @end_lng DECIMAL(9,6);

    DECLARE insert_cursor CURSOR FOR
        SELECT user_id, route_name, start_lat, start_lng, end_lat, end_lng FROM inserted;

    OPEN insert_cursor;
    FETCH NEXT FROM insert_cursor INTO @user_id, @route_name, @start_lat, @start_lng, @end_lat, @end_lng;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @next_id INT;
        SELECT @next_id = MAX(route_id) + 1 FROM user_routes WHERE user_id = @user_id;
        IF @next_id IS NULL SET @next_id = 1;

        INSERT INTO user_routes (
            user_id, route_id, route_name, start_lat, start_lng, end_lat, end_lng, created_at
        ) VALUES (
            @user_id, @next_id, @route_name, @start_lat, @start_lng, @end_lat, @end_lng, GETDATE()
        );

        FETCH NEXT FROM insert_cursor INTO @user_id, @route_name, @start_lat, @start_lng, @end_lat, @end_lng;
    END

    CLOSE insert_cursor;
    DEALLOCATE insert_cursor;
END;
GO

-- ===============================
-- ===============================
-- SAMPLE DATA INSERTS
-- ===============================
-- ===============================

-- ===============================
-- user_saved_locations
-- ===============================

-- For Mary Tan (user_id = 2)
INSERT INTO user_saved_locations (user_id, location_name, latitude, longitude)
VALUES
(2, 'Toa Payoh Central', 1.334600, 103.849800),
(2, 'Novena Square', 1.320200, 103.843100);

-- For Ahmad Hassan (user_id = 3)
INSERT INTO user_saved_locations (user_id, location_name, latitude, longitude)
VALUES
(3, 'Jurong West St 24', 1.340800, 103.703900),
(3, 'Jurong Polyclinic', 1.339900, 103.704100);

-- For Robert Lim (user_id = 5)
INSERT INTO user_saved_locations (user_id, location_name, latitude, longitude)
VALUES
(5, 'Ang Mo Kio Hub', 1.369200, 103.849000);

-- For Susan Wong (user_id = 6)
INSERT INTO user_saved_locations (user_id, location_name, latitude, longitude)
VALUES
(6, 'Hougang Mall', 1.372100, 103.897200),
(6, 'Punggol Plaza', 1.405000, 103.901800);

-- For Mohamed Ali (user_id = 9)
INSERT INTO user_saved_locations (user_id, location_name, latitude, longitude)
VALUES
(9, 'Yishun MRT', 1.429100, 103.835100),
(9, 'Masjid Sultan', 1.304100, 103.859900);

-- ===============================
-- user_routes
-- ===============================
-- For Mary Tan (user_id = 2)
INSERT INTO user_routes (user_id, route_name, start_lat, start_lng, end_lat, end_lng)
VALUES
(2, 'Home to Toa Payoh Central', 1.332000, 103.848000, 1.334600, 103.849800),
(2, 'Toa Payoh to Novena', 1.334600, 103.849800, 1.320200, 103.843100);

-- For Ahmad Hassan (user_id = 3)
INSERT INTO user_routes (user_id, route_name, start_lat, start_lng, end_lat, end_lng)
VALUES
(3, 'Home to Jurong Polyclinic', 1.340800, 103.703900, 1.339900, 103.704100);

-- For Susan Wong (user_id = 6)
INSERT INTO user_routes (user_id, route_name, start_lat, start_lng, end_lat, end_lng)
VALUES
(6, 'Hougang to Punggol', 1.372100, 103.897200, 1.405000, 103.901800);

-- For Mohamed Ali (user_id = 9)
INSERT INTO user_routes (user_id, route_name, start_lat, start_lng, end_lat, end_lng)
VALUES
(9, 'Yishun to Masjid Sultan', 1.429100, 103.835100, 1.304100, 103.859900);

CREATE TABLE nearby_events(
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    location_name NVARCHAR(100) NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    event_info NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (user_id, location_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

CREATE TABLE nearby_sports_facilities(
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    location_name NVARCHAR(100) NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    PRIMARY KEY (user_id, location_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

INSERT INTO nearby_events (user_id, location_id, location_name, latitude, longitude, event_info) VALUES
-- User 1 events
(1, 1, 'Marina Bay New Year Countdown', 1.283333, 103.858611, 'Grand New Year celebration with fireworks and live performances. Free entry, starts at 8 PM. Food stalls available.'),
(1, 2, 'Community Health Fair', 1.279444, 103.834722, 'Free health screenings, vaccination drives, and wellness talks by medical professionals. Family-friendly event from 9 AM to 5 PM.'),
(1, 3, 'Aviation Expo 2025', 1.350189, 103.994433, 'Discover the latest in aviation technology. Interactive exhibits, flight simulators, and career talks. Entry fee: $15 adults, $8 children.'),
(1, 4, 'University Open House', 1.296568, 103.776239, 'Explore academic programs, campus tours, and meet faculty members. Free admission with registration required online.'),
(1, 5, 'Beach Music Festival', 1.249756, 103.830119, 'Three-day music festival featuring local and international artists. Beach activities and food vendors. Tickets from $80.'),

-- User 2 events
(2, 1, 'Orchard Fashion Week', 1.304444, 103.831944, 'Latest fashion trends showcase with designer collections. Fashion shows daily at 2 PM and 7 PM. Free for public viewing.'),
(2, 2, 'Wildlife Photography Workshop', 1.404175, 103.793036, 'Learn wildlife photography techniques with professional photographers. Equipment provided. Workshop fee: $120 includes lunch.'),
(2, 3, 'River Festival', 1.288611, 103.846667, 'Cultural performances, dragon boat races, and riverside dining. Traditional crafts market and live music. Free admission.'),
(2, 4, 'Tech Innovation Summit', 1.333056, 103.739167, 'Startup pitches, tech talks, and networking sessions. Industry leaders and investors present. Registration: $50 students, $150 professionals.'),
(2, 5, 'Cycling Marathon', 1.301389, 103.928056, 'Annual cycling event along East Coast. Multiple categories: 10km, 25km, 50km routes. Registration fee includes event t-shirt and medal.'),

-- User 3 events
(3, 1, 'Financial District Food Festival', 1.283611, 103.851389, 'Local and international cuisine festival. Over 50 food stalls, cooking demonstrations, and wine tasting. Weekend event, free entry.'),
(3, 2, 'Garden Concert Series', 1.314722, 103.815833, 'Classical music performances in beautiful garden setting. Monthly concerts featuring Singapore Symphony Orchestra. Tickets: $25-$75.'),
(3, 3, 'Cross-Border Cultural Fair', 1.448056, 103.765278, 'Celebrate Malaysian-Singapore friendship with cultural performances, traditional games, and authentic food. Free admission for families.'),
(3, 4, 'Shopping Carnival', 1.352083, 103.944722, 'Mega sale event with up to 70% discounts. Fashion shows, lucky draws, and entertainment programs. Special promotions for early birds.'),
(3, 5, 'Sunrise Yoga Session', 1.390833, 103.988056, 'Weekly beachside yoga classes at sunrise. All levels welcome. Bring your own mat. Donation-based, suggested $10 per session.'),

-- Additional events for variety
(1, 6, 'Chinatown Heritage Walk', 1.281944, 103.844167, 'Guided tour exploring Chinatown history and culture. Traditional performances, food stalls, and souvenir shops. Free admission, open daily from 9 AM to 6 PM.'),
(2, 6, 'Botanic Gardens Night Tour', 1.319667, 103.815278, 'Guided night tour of Botanic Gardens. Stargazing, lantern releases, and live music. Free admission, open daily from 6 PM to 10 PM.'),
(3, 6, 'Jurong Bird Park Safari', 1.340833, 103.703944, 'Interactive safari experience at Jurong Bird Park. Feeding sessions, animal shows, and educational talks. Admission: $25 adults, $15 children.')