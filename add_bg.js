const sharp = require('sharp');

async function main() {
  try {
    await sharp('public/logo-linha-uni.png')
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Transforma transparente em branco
      .toFile('src/app/icon.png');
      
    await sharp('public/logo-linha-uni.png')
      .flatten({ background: { r: 255, g: 255, b: 255 } }) 
      .toFile('C:/Users/felip/.gemini/antigravity-ide/brain/2ee845fc-aef6-4e76-9c94-2f9cc52d92a6/icon_preview.png');
      
    console.log("Success! Saved as src/app/icon.png and artifact preview.");
  } catch (error) {
    console.error("Error editing image:", error);
  }
}

main();
