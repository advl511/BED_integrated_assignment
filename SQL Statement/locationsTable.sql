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
