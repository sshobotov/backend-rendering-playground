## How to work with minikube
----------------------------

Start with overriden resource prerequisits
```
minikube start --memory 8192 --cpus 6
```

NOTE: your Docker should have enough resources allocated (see Preferences > Resources)

if it was already started before provisioning enough resources re-start with deletion
```
minikube stop
minikube delete
```

For local experiments it might be helpful to install plugins:

- for publishing images into minikube registry (instead of public registry)
```
minikube addons enable registry
```

- for monitoring resources consumed by pods/nodes
```
minikube addons enable metrics-server
```

To publish Docker image into minikube registry it is required to run redirection (see https://minikube.sigs.k8s.io/docs/handbook/registry/)
```
docker run --rm -it --network=host alpine ash -c "apk add socat && socat TCP-LISTEN:5000,reuseaddr,fork TCP:$(minikube ip):5000"
```

then tag built Docker image and push it
```
docker tag <image_name> localhost:5000/<image_name>
docker push localhost:5000/<image_name>
```

Once k8s deployment was applied it could be exposed without Service creation with
```
kubectl expose deployment <app_deployment_name> --type=LoadBalancer --port=8080 --target-port=3000
```

to make it work tunneling should be run on minikube (see https://minikube.sigs.k8s.io/docs/handbook/accessing/)
```
minikube tunnel
```