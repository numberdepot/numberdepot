# backup/

Bind-mounted into the `mongo` container at `/backup`.

Put a `mongodump` archive here and `mongorestore` can read it from inside the
container, e.g.:

    docker compose exec mongo mongorestore \
      --username "$MONGO_USER" --password "$MONGO_PASS" --authenticationDatabase admin \
      --archive=/backup/atlas.archive --gzip --drop

Kept out of git except for this file.
