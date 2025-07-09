    function postStatus() {
      const text = document.getElementById('statusText').value.trim();
      const photoInput = document.getElementById('photoInput');
      const file = photoInput.files[0];
      const feed = document.getElementById('feed');

      if (text === "" && !file) {
        alert("Please write something or add a photo.");
        return;
      }

      const post = document.createElement('div');
      post.className = 'post';

      const avatar = document.createElement('div');
      avatar.className = 'avatar';

      const postContent = document.createElement('div');
      postContent.className = 'post-content';

      const name = document.createElement('strong');
      name.textContent = 'User';

      const content = document.createElement('p');
      content.textContent = text;

      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      timestamp.textContent = 'Just now';

      postContent.appendChild(name);
      if (text) postContent.appendChild(content);
      if (file) {
        const fileName = document.createElement('p');
        fileName.style.fontSize = "12px";
        fileName.textContent = "📷 " + file.name;
        postContent.appendChild(fileName);
      }
      postContent.appendChild(timestamp);

      post.appendChild(avatar);
      post.appendChild(postContent);

      feed.prepend(post);

      // Reset inputs
      document.getElementById('statusText').value = '';
      photoInput.value = '';
    }