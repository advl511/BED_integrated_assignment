const sql = require('mssql');
const config = require('./dbConfig');

async function createProfile(userId, profileData) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      INSERT INTO profiles (user_id, bio, location, website, birthday, privacy_settings, profile_picture_url)
      VALUES (${userId}, ${profileData.bio || ''}, ${profileData.location || ''}, 
              ${profileData.website || ''}, ${profileData.birthday}, 
              ${JSON.stringify(profileData.privacy_settings || {})}, ${profileData.profile_picture_url || null})
    `;
    return result;
  } catch (err) {
    throw err;
  }
}

async function getProfileByUserId(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT p.*, u.username, u.email, u.first_name, u.last_name, u.phone_number, u.age, u.gender, u.race, u.nationality, u.date_of_birth
      FROM profiles p
      RIGHT JOIN users u ON p.user_id = u.user_id
      WHERE u.user_id = ${userId}
    `;
    return result.recordset[0];
  } catch (err) {
    throw err;
  }
}

async function updateProfile(userId, profileData) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      UPDATE profiles 
      SET bio = ${profileData.bio || ''}, 
          location = ${profileData.location || ''}, 
          website = ${profileData.website || ''}, 
          birthday = ${profileData.birthday}, 
          privacy_settings = ${JSON.stringify(profileData.privacy_settings || {})},
          profile_picture_url = ${profileData.profile_picture_url || null},
          updated_at = GETDATE()
      WHERE user_id = ${userId}
    `;
    
    if (result.rowsAffected[0] === 0) {
      // Profile doesn't exist, create it
      return await createProfile(userId, profileData);
    }
    
    return await getProfileByUserId(userId);
  } catch (err) {
    throw err;
  }
}

async function updateProfilePicture(userId, pictureUrl) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      UPDATE profiles 
      SET profile_picture_url = ${pictureUrl}, updated_at = GETDATE()
      WHERE user_id = ${userId}
    `;
    
    if (result.rowsAffected[0] === 0) {
      // Profile doesn't exist, create it with picture
      return await createProfile(userId, { profile_picture_url: pictureUrl });
    }
    
    return await getProfileByUserId(userId);
  } catch (err) {
    throw err;
  }
}

async function deleteProfile(userId) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      DELETE FROM profiles WHERE user_id = ${userId}
    `;
    return result;
  } catch (err) {
    throw err;
  }
}

async function searchProfiles(query, limit = 20) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT p.*, u.username, u.email, u.first_name, u.last_name
      FROM profiles p
      JOIN users u ON p.user_id = u.user_id
      WHERE (u.username LIKE ${'%' + query + '%'} OR 
             u.email LIKE ${'%' + query + '%'} OR 
             u.first_name LIKE ${'%' + query + '%'} OR 
             u.last_name LIKE ${'%' + query + '%'} OR
             p.bio LIKE ${'%' + query + '%'})
      ORDER BY u.username
      OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    return result.recordset;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
  updateProfilePicture,
  deleteProfile,
  searchProfiles,
};
