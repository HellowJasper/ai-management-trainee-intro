FROM nginx:alpine

# Copy static website files into Nginx default public directory
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
