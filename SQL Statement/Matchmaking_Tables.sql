-- Create MatchQueue table for users waiting to be matched
CREATE TABLE MatchQueue (
    QueueID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    JoinTime DATETIME2 DEFAULT GETDATE(),
    IsMatched BIT DEFAULT 0,
    MatchID INT NULL,
    CONSTRAINT FK_MatchQueue_Users FOREIGN KEY (UserID) REFERENCES users(user_id) ON DELETE CASCADE
);
GO

-- Create Matches table to track active and completed matches
CREATE TABLE Matches (
    MatchID INT IDENTITY(1,1) PRIMARY KEY,
    User1ID INT NOT NULL,
    User2ID INT NOT NULL,
    MatchTime DATETIME2 DEFAULT GETDATE(),
    Status NVARCHAR(20) DEFAULT 'active' CHECK (Status IN ('active', 'completed', 'cancelled', 'blocked')),
    WinnerID INT NULL,
    CompletedTime DATETIME2 NULL,
    CONSTRAINT FK_Matches_User1 FOREIGN KEY (User1ID) REFERENCES users(user_id),
    CONSTRAINT FK_Matches_User2 FOREIGN KEY (User2ID) REFERENCES users(user_id),
    CONSTRAINT FK_Matches_Winner FOREIGN KEY (WinnerID) REFERENCES users(user_id),
    CONSTRAINT CHK_UserOrder CHECK (User1ID < User2ID) -- Ensures each pair is stored only once
);
GO

-- Create indexes for better performance
CREATE INDEX IDX_MatchQueue_UserID ON MatchQueue(UserID);
CREATE INDEX IDX_MatchQueue_IsMatched ON MatchQueue(IsMatched);
CREATE INDEX IDX_Matches_User1ID ON Matches(User1ID);
CREATE INDEX IDX_Matches_User2ID ON Matches(User2ID);
CREATE INDEX IDX_Matches_Status ON Matches(Status);
GO

-- Drop the old matchmaking_queue table if it exists
IF OBJECT_ID('matchmaking_queue', 'U') IS NOT NULL
    DROP TABLE matchmaking_queue;
GO
