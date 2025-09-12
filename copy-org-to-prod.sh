#!/bin/bash

# Configuration
DEV_URI="mongodb://localhost:27017/pos"
PROD_URI="mongodb+srv://doadmin:03a5t74dNzS892PA@cultcha-db-mongodb-syd1-0956ff2f.mongo.ondigitalocean.com/admin?tls=true&authSource=admin"
ORG_ID="689f13f0cb0754341e093d78"  # Replace with your org ID

# Export single org document from dev
echo "Exporting org from dev database..."
mongodump --uri="$DEV_URI" \
  --collection=orgs \
  --query="{\"_id\": {\"\$oid\": \"$ORG_ID\"}}" \
  --out=./org-export

# Import to production
echo "Importing org to production database..."
mongorestore --uri="$PROD_URI" \
  --db=pos \
  --collection=orgs \
  --drop \
  ./org-export/pos/orgs.bson

# Clean up
rm -rf ./org-export

echo "Org copied successfully!"
