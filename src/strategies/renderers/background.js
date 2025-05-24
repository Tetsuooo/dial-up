import Framework from '~/framework';

const backgroundLayerRenderer = function(fileNames, container, rootStage) {
  fileNames.forEach((filename) => {
    Framework.paintSprite.bind(this)(filename, container, rootStage);
  });
};

export {
  backgroundLayerRenderer
};
