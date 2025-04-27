import OAuth from 'oauth';

const KEY = process.env.NOUN_PROJECT_KEY;
const SECRET = process.env.NOUN_PROJECT_SECRET;

const oauth = new OAuth.OAuth(
  'https://api.thenounproject.com',
  'https://api.thenounproject.com',
  KEY,
  SECRET,
  '1.0',
  null,
  'HMAC-SHA1'
);

export async function getIcons({query}) {
  // console.log(process.env.NOUN_PROJECT_KEY)
  // const { searchParams } = new URL(req.url);
  // const query = searchParams.get('q'); // Get the query parameter (search string)

  // if (!query) {
  //   return NextResponse.json({ error: 'Query parameter `q` is required' }, { status: 400 });
  // }

  return new Promise((resolve, reject) => {
    oauth.get(
      `https://api.thenounproject.com/v2/icon?query=${query}&limit=15`,
      null, // User token (null for public endpoint)
      null, // User secret (null for public endpoint)
      function (e, data, response) {
        if (e) {
          console.error('OAuth error:', e);
          // return resolve(NextResponse.json({ error: 'OAuth request failed' }, { status: 500 }));
        } else {
          console.log(data)
          // return resolve(NextResponse.json(JSON.parse(data), { status: 200 }));
          return resolve(data)
        }
      }
    );
  });
}