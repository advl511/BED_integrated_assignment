const sql = require('mssql');
const config = require('../dbConfig');

async function createProfile(userId, profileData) {
  try {
    await sql.connect(config);
    const result = await sql.query`
      INSERT INTO profiles (user_id, bio, location, website, birthday, privacy_settings, profile_picture_url, 
                           address, emergency_contact, medical_notes, allergies)
      VALUES (${userId}, ${profileData.bio || ''}, ${profileData.location || ''}, 
              ${profileData.website || ''}, ${profileData.birthday}, 
              ${JSON.stringify(profileData.privacy_settings || {})}, ${profileData.profile_picture_url || null},
              ${profileData.address || ''}, ${profileData.emergency_contact || ''}, 
              ${profileData.medical_notes || ''}, ${profileData.allergies || ''})
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
    
    const profile = result.recordset[0];
    
    // If no profile exists (profile fields are null), create a default one
    if (profile && !profile.profile_id) {
      console.log('No profile found for user, creating default profile');
      await createProfile(userId, {
        bio: '',
        location: '',
        website: '',
        birthday: null,
        privacy_settings: {},
        profile_picture_url: null,
        address: '',
        emergency_contact: '',
        medical_notes: '',
        allergies: ''
      });
      
      // Fetch the profile again with the newly created profile
      const newResult = await sql.query`
        SELECT p.*, u.username, u.email, u.first_name, u.last_name, u.phone_number, u.age, u.gender, u.race, u.nationality, u.date_of_birth
        FROM profiles p
        RIGHT JOIN users u ON p.user_id = u.user_id
        WHERE u.user_id = ${userId}
      `;
      return newResult.recordset[0];
    }
    
    return profile;
  } catch (err) {
    throw err;
  }
}

async function updateProfile(userId, profileData) {
  try {
    await sql.connect(config);
    
    // Build dynamic update query based on provided fields
    let setClause = [];
    let queryParams = [];
    
    if (profileData.bio !== undefined) {
      setClause.push('bio = @bio');
      queryParams.push({ name: 'bio', type: sql.NVarChar, value: profileData.bio });
    }
    if (profileData.location !== undefined) {
      setClause.push('location = @location');
      queryParams.push({ name: 'location', type: sql.NVarChar, value: profileData.location });
    }
    if (profileData.website !== undefined) {
      setClause.push('website = @website');
      queryParams.push({ name: 'website', type: sql.NVarChar, value: profileData.website });
    }
    if (profileData.birthday !== undefined) {
      setClause.push('birthday = @birthday');
      queryParams.push({ name: 'birthday', type: sql.Date, value: profileData.birthday });
    }
    if (profileData.privacy_settings !== undefined) {
      setClause.push('privacy_settings = @privacy_settings');
      queryParams.push({ name: 'privacy_settings', type: sql.NVarChar, value: JSON.stringify(profileData.privacy_settings) });
    }
    if (profileData.profile_picture_url !== undefined) {
      setClause.push('profile_picture_url = @profile_picture_url');
      queryParams.push({ name: 'profile_picture_url', type: sql.NVarChar, value: profileData.profile_picture_url });
    }
    if (profileData.address !== undefined) {
      setClause.push('address = @address');
      queryParams.push({ name: 'address', type: sql.NVarChar, value: profileData.address });
    }
    if (profileData.emergency_contact !== undefined) {
      setClause.push('emergency_contact = @emergency_contact');
      queryParams.push({ name: 'emergency_contact', type: sql.NVarChar, value: profileData.emergency_contact });
    }
    if (profileData.medical_notes !== undefined) {
      setClause.push('medical_notes = @medical_notes');
      queryParams.push({ name: 'medical_notes', type: sql.NVarChar, value: profileData.medical_notes });
    }
    if (profileData.allergies !== undefined) {
      setClause.push('allergies = @allergies');
      queryParams.push({ name: 'allergies', type: sql.NVarChar, value: profileData.allergies });
    }
    if (profileData.first_name !== undefined) {
      setClause.push('myname = @myname');
      queryParams.push({ name: 'myname', type: sql.NVarChar, value: profileData.first_name });
    }
    if (profileData.age !== undefined) {
      setClause.push('agee = @agee');
      queryParams.push({ name: 'agee', type: sql.Int, value: profileData.age ? parseInt(profileData.age) : null });
    }
    if (profileData.phone_number !== undefined) {
      setClause.push('phones = @phones');
      queryParams.push({ name: 'phones', type: sql.NVarChar, value: profileData.phone_number });
    }
    
    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Add updated_at to all updates
    setClause.push('updated_at = GETDATE()');
    
    const request = new sql.Request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    request.input('userId', sql.Int, userId);
    
    const query = `UPDATE profiles SET ${setClause.join(', ')} WHERE user_id = @userId`;
    const result = await request.query(query);
    
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
