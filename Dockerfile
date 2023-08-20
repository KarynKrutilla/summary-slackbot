#FROM public.ecr.aws/lambda/nodejs:14
FROM amazon/aws-lambda-nodejs:14

# Copy function code
COPY app.js birthdayNotifier.js summarize.js vlog.js otherNotifications.js books.js package*.json .env ${LAMBDA_TASK_ROOT}

RUN npm install

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "app.handler" ]
