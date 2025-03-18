# Check-in Grid App

A simple grid-based check-in application that allows tracking weekly activities. The app uses Digital Ocean Spaces for persistent storage of the grid state.

## Digital Ocean Spaces Integration

This app can save its state to Digital Ocean Spaces, which allows for persistence between browser sessions and devices.

### Setup

1. Create a Digital Ocean account if you don't have one
2. Create a new Spaces bucket in your preferred region
3. Create API keys:
   - Go to API > Tokens/Keys
   - Generate new Spaces access keys
   - Save both the access key and secret key securely
4. Configure CORS for your Space (REQUIRED):
   - Go to your Space in the Digital Ocean console
   - Click on "Settings" and then the "CORS" tab
   - Add a CORS configuration:
     - Origin: `*` (or your specific domain like `http://localhost:3000`)
     - Allowed Methods: `GET, PUT, POST, DELETE`
     - Allowed Headers: `*`
     - Max Age: `86400` (or your preferred value)
   - Click "Save"
5. Copy the `.env.example` file to `.env.local`:
   ```
   cp .env.example .env.local
   ```
6. Edit the `.env.local` file and add your Digital Ocean Spaces configuration:
   ```
   REACT_APP_DO_SPACES_ACCESS_KEY=your_access_key_here
   REACT_APP_DO_SPACES_SECRET_KEY=your_secret_key_here
   REACT_APP_DO_SPACES_ENDPOINT=https://your-region.digitaloceanspaces.com
   REACT_APP_DO_SPACES_REGION=your-region
   REACT_APP_DO_SPACES_BUCKET=your-bucket-name
   ```

If the Digital Ocean Spaces configuration is not provided, the app will still work but won't save state between sessions.

### CORS Issues

If you encounter CORS errors when saving state:
1. Verify that you have configured CORS on your Digital Ocean Space as described above
2. For local development, make sure your environment variables are correctly set in `.env.local`
3. If deploying to production, ensure your production domain is included in the allowed origins (or use `*` for any origin)

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).