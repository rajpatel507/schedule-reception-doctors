rm -r ./build/*
grunt
aws s3 sync ./build/ s3://schedule-reception-doctors/ --delete --cache-control "public, max-age=3600"
