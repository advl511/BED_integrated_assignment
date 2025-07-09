const uploadInput = document.getElementById('upload');
    const profilePic = document.getElementById('profile-pic');

    uploadInput.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          profilePic.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    function saveProfile() {
      const email = document.querySelector('.email').value;
      const bio = document.querySelector('.bio-box').value;
      alert(`Profile saved!\nEmail: ${email}\nBio: ${bio}`);
    }