// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Rename config.example.json to config.json
 * Replace FIREBASE_STORAGE_BUCKET_LINK with the link of the firebase project
 */
const config = require('../config.json');

/**
 * Load service account credentials
 * To generate service account credentials, go to https://firebase.google.com/docs/admin/setup
 * Select the firebase project
 * Navigate to the Service Accounts tab in your project's settings page
 * Click the Generate New Private Key button at the bottom of the Firebase Admin SDK section of the Service Accounts tab
 * A JSON file containing your service account's credentials will be downloaded
 * Rename the file to serviceAccountKey.json
 * Or replace the values in serviceAccountKey.example.json and rename it to serviceAccountKey.json
 */ 
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: config.firebase_storage_bucket
});

/**
 * Cloud Function
 * Processes data received from the submitted form. Attempts to store processed data as JSON file in a cloud storage bucket
 */
export const processFormData = functions.https.onRequest((req, res) => {
    /**
     * Handle server-side recaptcha verification
     * Server-side verification has not yet been implemented
     * This is because, Firebase hosted applications do not allow access to external Google cloud resources like Google Recaptcha on the Firebase Spark (free) plan
     * In order to do that, one must be subscribed to either the Blaze plan or any other paid Firebase plan
     * So, the rest of the application will flow based on the assumption that server-side verification completely succeeds
     * To perform server-side recaptcha verification:
     * - Get the user's token response, g-recaptcha-response, as a POST parameter when the user submits the form
     * - Make a POST request to https://www.google.com/recaptcha/api/siteverify to ensure that the token response is valid
     * - Pass along the following 3 parameters to the POST request:
     * -- secret: Required. The shared key between your site and reCAPTCHA.
     * -- response: Required. The user response token provided by reCAPTCHA, verifying the user on your site.
     * -- remoteip: Optional. The user's IP address.
     * Continue with the rest of the code only if the 'success' attribute of the response is true
     */

    // Extract form data
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;

    // Extra query parameters
    const userAgent = req.query.userAgent;
    const redirectTo = req.query.redirectTo;

    /**
     * Determine user's ip address.
     * If our Node app is running on a proxy: req.header('x-forwarded-for')
     * Otherwise: req.connection.remoteAddress
     */
    const ip = req.header('x-forwarded-for') || req.connection.remoteAddress;

    // JSON data to be stored
    const data = {
        first_name: firstName,
        last_name: lastName,
        email_address: email,
        user_agent: userAgent,
        ip_address: ip
    }

    // Create reference to the cloud storage bucket
    const bucket = admin.storage().bucket();
    
    // Reference to a cloud storage bucket file
    const file = bucket.file(`processedData/${email}.json`);

    file.exists().then((_exists) => { // Check if the file already exists in the bucket
        if (_exists[0]) { // The email has already been used in creating a JSON file
            const msg = `The email: ${email}, has already been used before. Please try again with another email!`;
            res.redirect(`${redirectTo}?success=false&msg=${msg}`);
        } else { // Email has not been used before. Proceed to store the details in the bucket
            const dataString = JSON.stringify(data); // Convert JSON data to string
            const buffer = Buffer.from(dataString); // Allocate a new Buffer with the string
            
            // Attempt storing the details as a JSON file in the bucket
            file.save(buffer, {
                public: true,
                metadata: {
                    contentType: 'application/json'
                }
            }).then(() => { // Details successfully stored as JSON file in the bucket
                file.getSignedUrl({
                    action: 'read',
                    expires: '12-03-2145' // Far date before expiration
                }).then((signedUrls: string[]) => {
                    const successMsg = `Stored a file (${file.name}), with the form details, user-agent and ip address of the user in a cloud storage bucket (${bucket.name})`;
                    res.redirect(`${redirectTo}?success=true&publicUrl=${signedUrls[0]}&msg=${successMsg}`);
                }).catch((e) => {
                    const successMsg = `Stored a file (${file.name}), with the form details, user-agent and ip address of the user in a cloud storage bucket (${bucket.name})`;
                    res.redirect(`${redirectTo}?success=true&msg=${successMsg}`);
                });
            }).catch((e) => { // Some error occured while storing the JSON file in the bucket
                const errorMsg = `Unable to store form details as ${file.name} file in cloud storage bucket`;
                res.redirect(`${redirectTo}?success=false&msg=${errorMsg}`);
            });
        }
    }).catch((e) => { // Some error occured while checking if the file exists
        const errorMsg = `Error occured while checking if ${file.name} file already exists in cloud storage bucket`;
        res.redirect(`${redirectTo}?success=false&msg=${errorMsg}`);
    });    
});