FROM nginx:alpine

# Copy application files to nginx html directory
COPY . /usr/share/nginx/html/

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Add custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]