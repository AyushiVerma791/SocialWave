const fs = require('fs');
const services = [
  { name: 'api-gateway', port: 4008 },
  { name: 'auth-service', port: 4001 },
  { name: 'user-service', port: 4002 },
  { name: 'post-service', port: 4003 },
  { name: 'feed-service', port: 4004 },
  { name: 'comment-service', port: 4005 },
  { name: 'friend-service', port: 4006 },
  { name: 'notification-service', port: 4007 },
  { name: 'story-service', port: 4009 },
  { name: 'controller-service', port: 4000 },
  { name: 'frontend', port: 80 }
];

let yaml = '';
services.forEach(s => {
  const imageName = s.name === 'frontend' ? 'socialwave-frontend' : 
                    s.name === 'api-gateway' ? 'socialwave-api-gateway' :
                    `socialwave-${s.name.replace('-service', '')}`;
  
  yaml += `
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${s.name}
  namespace: socialwave
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${s.name}
  template:
    metadata:
      labels:
        app: ${s.name}
    spec:
      containers:
      - name: ${s.name}
        image: ${imageName}:latest
        imagePullPolicy: Never
        ports:
        - containerPort: ${s.port}
        env:
        - name: PORT
          value: "${s.port}"
        - name: MONGO_URI
          value: "mongodb://mongodb:27017/${s.name.replace('-service', '-db')}"
        - name: JWT_SECRET
          value: "supersecretjwtkey"
        - name: CTRL_URL
          value: "http://controller-service:4000"
        - name: NOTIFY_URL
          value: "http://notification-service:4007"
        - name: FRIEND_URL
          value: "http://friend-service:4006"
        - name: POST_URL
          value: "http://post-service:4003"
        - name: USER_URL
          value: "http://user-service:4002"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "300m"
        livenessProbe:
          httpGet:
            path: /
            port: ${s.port}
          initialDelaySeconds: 15
          periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: ${s.name}
  namespace: socialwave
spec:
  selector:
    app: ${s.name}
  ports:
    - protocol: TCP
      port: ${s.port}
      targetPort: ${s.port}
`;
});

fs.writeFileSync('k8s/base/microservices.yaml', yaml);
