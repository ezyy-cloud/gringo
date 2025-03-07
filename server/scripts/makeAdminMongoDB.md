# Make a User an Admin using MongoDB Shell

If you're having trouble with the Node.js scripts, you can make a user an admin directly using the MongoDB shell.

## Using MongoDB Shell Command

Connect to your MongoDB instance and run the following command (replacing `YOUR_USERNAME` with the actual username):

```
db.users.updateOne({ username: "YOUR_USERNAME" }, { $set: { isAdmin: true } })
```

## Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to your MongoDB instance
3. Navigate to your database
4. Open the `users` collection
5. Find the user by searching for their username
6. Edit the document and add `isAdmin: true` or change the existing value to `true`
7. Save the changes

## Using mongosh

```bash
# Replace with your connection string
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database"

# Switch to your database
use your_database_name

# Update the user - replace YOUR_USERNAME with the actual username
db.users.updateOne({ username: "YOUR_USERNAME" }, { $set: { isAdmin: true } })

# Verify the update
db.users.findOne({ username: "YOUR_USERNAME" })

# Exit mongosh
exit
```

## Using MongoDB Atlas

1. Login to your MongoDB Atlas account
2. Navigate to your cluster
3. Click on "Collections"
4. Navigate to your database and the `users` collection
5. Find the user by searching for their username
6. Click "Edit Document"
7. Add `isAdmin: true` or change the existing value to `true`
8. Click "Update" 