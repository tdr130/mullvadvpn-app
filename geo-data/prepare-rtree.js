//
// Script that generates r-trees for countries and cities.
// run with `yarn babel-node geo-data/prepare-rtree.js`
//

import fs from 'fs';
import path from 'path';
import rbush from 'rbush';

const input = ['countries', 'cities'];

for(const name of input) {
  const source = path.join(__dirname, `${name}.geo.json`);
  const destination = path.join(__dirname, `${name}.rbush.json`);
  const data = fs.readFileSync(source);
  const collection = JSON.parse(data);
  const treeData = collection.features.map((feat) => {
    const { coordinates } = feat.geometry;
    return { ...feat,
      minX: coordinates[0],
      minY: coordinates[1],
      maxX: coordinates[0],
      maxY: coordinates[1],
    };
  });

  const tree = rbush();
  tree.load(treeData);
  fs.writeFileSync(destination, JSON.stringify(tree.toJSON()));

  console.log(`Saved a rbush tree at ${destination}`);
}