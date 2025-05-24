import { Container, Text, Sprite, Texture } from 'pixi.js';

const constructTextEntry = (textContent) => {
  // Create a Text with the provided style.
  const text = new Text(textContent, {
    fontFamily: 'Arial',
    fontSize: 23,
    fill: 'black',
    fontStretch: 'extra-condensed'
  });

  // Create a background sprite using a white texture.
  const textBG = new Sprite(Texture.WHITE);

  // Position the text relative to its background.
  text.x = 16;
  // Set a fixed size for the background.
  textBG.width = 130;
  textBG.height = 28;

  // Make the background interactive.
  textBG.interactive = true;
  textBG.tint = 0xffff1a;

  // Use pointer events (instead of deprecated mouse events).
  textBG.on('pointerover', () => {
    textBG.tint = 0xffffff;
  });
  textBG.on('pointerout', () => {
    textBG.tint = 0xffff1a;
  });

  // Create a container (cage) and add both the background and text.
  const cage = new Container();
  cage.addChild(textBG, text);

  return cage;
};

const renderMenu = (nameArray) => {
  const cage = new Container();

  // Create an entry for each name in the array.
  for (let i = 0; i < nameArray.length; i++) {
    const entry = constructTextEntry(nameArray[i]);
    entry.y = entry.height * i; // Stack vertically.
    cage.addChild(entry);
  }

  return cage;
};

export { renderMenu };
