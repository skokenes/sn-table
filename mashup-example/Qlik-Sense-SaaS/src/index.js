/* eslint-disable */
import embed from './configure';
import connect from './connect';

async function run() {
  const app = await connect({
    url: '<URL>',
    webIntegrationId: '<Qlik web integration id>',
    appId: '<App id>',
  });

  const nuked = embed(app);

  (await nuked.selections()).mount(document.querySelector('.toolbar'));

  // create a session object
  nuked.render({
    element: document.querySelector('.object'),
    type: 'table',
    fields: ['Sales Quantity', '=Sum([Sales Quantity])'],
  });

  // create another session object
  nuked.render({
    element: document.querySelectorAll('.object')[1],
    type: 'table',
    fields: ['Sales Price', '=Sum([Sales Quantity]*[Sales Price])'],
  });
}

run();
