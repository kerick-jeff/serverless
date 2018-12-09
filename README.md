# Serverless
A simple serverless function hosted on Firebase

# Prerequisites
* NodeJS 6+
* NPM
* Create a project on Firebase console
* From your Firebase console, create a cloud storage bucket. Replace the cloud storage bucket link in the functions/config.example.json file. Then, rename functions/config.example.ts to functions/config.json
* Generate admin sdk service account credentials. Download the service account credentials. Copy the contents to functions/serviceAccountKey.example.json . Rename functions/serviceAccountKey.example.json to functions/serviceAccountKey.json

# Deployment
* Open up a terminal window
* Run `firebase login` to log in via the browser and authenticate the firebase tool.
* Go to `functions` directory and run `npm install` to install dependencies
* To deploy to the Firebase cloud functions, run: firebase deploy --only functions

