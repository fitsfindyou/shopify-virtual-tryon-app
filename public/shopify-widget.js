(function() {
  console.log('Shopify widget script started');

  // Create the "See Me In This" button
  const tryOnButton = document.createElement('button');
  tryOnButton.textContent = 'See Me In This';
  tryOnButton.style.marginBottom = '10px';
  tryOnButton.className = 'button button--full-width button--primary';
  tryOnButton.type = 'button'; // Ensure it's not a submit button

  // Find the "Add to Cart" button
  const addToCartButton = document.querySelector('button[name="add"]');
  if (addToCartButton && addToCartButton.parentNode) {
    addToCartButton.parentNode.insertBefore(tryOnButton, addToCartButton);
    console.log('Try-on button inserted into DOM');
  } else {
    console.error('Could not find the Add to Cart button');
    return;
  }

  // Create a modal for the photo upload and try-on feature
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'none'; // Hidden by default
  modal.style.zIndex = '1000'; // Ensure it appears above other content
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.flexDirection = 'column'; // Ensure flexbox centering
  modal.style.display = 'flex'; // Ensure flexbox is applied

  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.padding = '20px';
  modalContent.style.border = '1px solid #888';
  modalContent.style.width = '80%';
  modalContent.style.maxWidth = '600px';
  modalContent.style.position = 'relative';

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.fontSize = '20px';
  closeButton.style.border = 'none';
  closeButton.style.background = 'none';
  closeButton.style.cursor = 'pointer';
  closeButton.addEventListener('click', function() {
    modal.style.display = 'none'; // Hide the modal
  });

  const productTitle = document.querySelector('.product__title').textContent;
  const productImage = document.querySelector('.product__image img').src;

  const uploadBox = document.createElement('div');
  uploadBox.id = 'uploadBox';
  uploadBox.style.width = '100%';
  uploadBox.style.height = '150px';
  uploadBox.style.border = '2px dashed #4CAF50';
  uploadBox.style.display = 'flex';
  uploadBox.style.alignItems = 'center';
  uploadBox.style.justifyContent = 'center';
  uploadBox.style.cursor = 'pointer';
  uploadBox.innerHTML = '<p>Click to upload or drag and drop an image here</p>';
  uploadBox.addEventListener('click', () => photoUpload.click());

  const photoUpload = document.createElement('input');
  photoUpload.type = 'file';
  photoUpload.id = 'photoUpload';
  photoUpload.accept = 'image/*';
  photoUpload.style.display = 'none';
  photoUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  });

  const replaceImageButton = document.createElement('button');
  replaceImageButton.textContent = 'Replace Image';
  replaceImageButton.className = 'button button--full-width button--secondary';
  replaceImageButton.style.marginTop = '10px';
  replaceImageButton.style.display = 'none'; // Hidden by default
  replaceImageButton.addEventListener('click', () => photoUpload.click());

  const tryItOnButton = document.createElement('button');
  tryItOnButton.textContent = 'Try it on';
  tryItOnButton.className = 'button button--full-width button--primary';
  tryItOnButton.style.marginTop = '10px';
  tryItOnButton.disabled = true; // Initially disabled
  tryItOnButton.addEventListener('click', async function() {
    const humanImg = imagePreview.src;
    if (humanImg) {
      await callReplicateAPI(productImage, humanImg, productTitle);
    } else {
      alert('Please upload an image first.');
    }
  });

  const resultContainer = document.createElement('div');
  resultContainer.id = 'resultContainer';
  resultContainer.style.marginTop = '20px';

  const imagePreview = document.createElement('img');
  imagePreview.id = 'imagePreview';
  imagePreview.style.maxWidth = '100%';
  imagePreview.style.maxHeight = '300px'; // Set a maximum height
  imagePreview.style.display = 'none'; // Hidden by default

  modalContent.appendChild(closeButton);
  modalContent.appendChild(uploadBox);
  modalContent.appendChild(photoUpload);
  modalContent.appendChild(imagePreview);
  modalContent.appendChild(replaceImageButton);
  modalContent.appendChild(tryItOnButton);
  modalContent.appendChild(resultContainer);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event listener for the "See Me In This" button
  tryOnButton.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    modal.style.display = 'flex'; // Show the modal
  });

  // Close the modal when clicking outside of it
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none'; // Hide the modal
    }
  });

  function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const humanImg = e.target.result;
      console.log('Image uploaded:', humanImg);

      // Display the uploaded image preview
      imagePreview.src = humanImg;
      imagePreview.style.display = 'block';
      tryItOnButton.disabled = false; // Enable the "Try it on" button
      uploadBox.style.display = 'none'; // Hide the upload box
      replaceImageButton.style.display = 'block'; // Show the replace image button
    };
    reader.readAsDataURL(file);
  }

  async function callReplicateAPI(garmImg, humanImg, garmentDes) {
    // Call the custom API endpoint
    const response = await fetch('/api/try-on', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        garmImg,
        humanImg,
        garmentDes
      })
    });

    const result = await response.json();
    if (result && result.status === 'processing') {
      checkJobStatus(result.jobId);
    } else {
      console.error('Error from API:', result);
      alert('An error occurred while processing the image.');
    }
  }

  async function checkJobStatus(jobId) {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/try-on?jobId=${jobId}`);
      const result = await response.json();

      if (result.status === 'completed') {
        clearInterval(interval);
        displayResult(result.output);
      } else if (result.status === 'failed') {
        clearInterval(interval);
        console.error('Error from API:', result);
        alert('An error occurred while processing the image.');
      }
    }, 5000); // Check every 5 seconds
  }

  function displayResult(outputUrl) {
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = `<img src="${outputUrl}" alt="Try-on result" style="max-width: 100%;">`;
  }

  console.log('Try-on widget fully initialized');
})();
