// images.js

// create an object containing old image names and new image names
function createImageNameObject(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    const today = new Date();
    const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    const images = doc.querySelectorAll('img');
    // Retrieve the value using jQuery and replace spaces with a hyphen
    let primaryKW = $('#primaryKeyword').val().trim().replace(/\s+/g, '-');

    const imgDetails = Array.from(images).flatMap((img, index) => {
        const src = img.getAttribute('src');
        if (!src) {
            console.warn('[blogbot] Skipping <img> with no src attribute:', img.outerHTML);
            return [];
        }
        let oldImgName = '';
        const startIndex = src.indexOf('images/') + 7;
        if (startIndex > 6) {
            const endIndex = src.indexOf('.', startIndex);
            if (endIndex !== -1) {
                oldImgName = src.substring(startIndex, endIndex);
            }
        }

        const order = index + 1;
        const randomNumber = Math.floor(Math.random() * 10000000) + 1;
        const newImgName = `${primaryKW}-${order}-${dateString}-${randomNumber}`;

        // Extract dimensions from the style attribute
        const style = img.getAttribute('style');
        const width = extractCssDimension(style, 'width');
        const height = extractCssDimension(style, 'height');

        // Determine the extension
        const extension = src.endsWith('.gif') ? 'gif' : 'webp';

        return [{
            order: order,
            tag: img.outerHTML,
            newSource: "",
            oldImgName: oldImgName,
            newImgName: newImgName,
            width: width || 'unknown',
            height: height || 'unknown',
            extension: extension
        }];
    });

    return imgDetails;
}


function extractCssDimension(styleString, property) {
    if (!styleString) return null;
    const regex = new RegExp(`${property}\\s*:\\s*(\\d+\\.?\\d*)px`, 'i');
    const match = styleString.match(regex);
    return match ? parseInt(match[1], 10) : null;
}


function extractCssDimension(styleString, property) {
    if (!styleString) return null;
    // This regex targets the property followed by a series of digits potentially including a decimal, ending with 'px'
    const regex = new RegExp(`${property}\\s*:\\s*(\\d+\\.?\\d*)px`, 'i');
    const match = styleString.match(regex);
    // Convert the captured value to an integer
    return match ? parseInt(match[1], 10) : null;
}

// updates img tags in the post source code to have the new image file names
function updateImageSources(htmlString, imgDetails) {
    // Iterate over each item in the imgDetails array
    imgDetails.forEach(detail => {
        // Construct the new image source URL
        // const newSrc = `https://knowledge.hubspot.com/hubfs/${detail.newImgName}`;

        const newSrc = `https://knowledge.hubspot.com/hubfs/${detail.newImgName}.${detail.extension}`;
        detail.newSource = newSrc;
        // Use a regular expression to find and replace the old image source
        const regex = new RegExp(`images/${detail.oldImgName}\\.[^"'\s]+`, 'g');
        htmlString = htmlString.replace(regex, newSrc);
    });

    return htmlString;
}

function convertImageToWebP(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            if (img.width === 0 || img.height === 0) {
                const err = new Error('Image has zero dimensions (width: ' + img.width + ', height: ' + img.height + ')');
                console.error('[blogbot] convertImageToWebP:', err);
                reject(err);
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((webpBlob) => {
                if (webpBlob) {
                    resolve(webpBlob);
                } else {
                    const err = new Error('canvas.toBlob() returned null (dimensions: ' + img.width + 'x' + img.height + ')');
                    console.error('[blogbot] convertImageToWebP:', err);
                    reject(err);
                    alert("WebP image conversion failed. Please check your Google Doc for any broken images and try again. If you are still having issues, reach out to Jamie.");
                }
            }, 'image/webp', 0.8);
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            const err = new Error('Image failed to load from blob');
            console.error('[blogbot] convertImageToWebP:', err, error);
            reject(err);
            alert("WebP image conversion failed. Please check your Google Doc for any broken images and try again. If you are still having issues, reach out to Jamie.");
        };
        img.src = objectUrl;
    });
}
