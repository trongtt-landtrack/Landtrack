import { getProjectConfigs } from './src/services/configService.ts';

async function test() {
  try {
    const configs = await getProjectConfigs();
    console.log(JSON.stringify(configs, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
