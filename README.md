# AdBlock Tracker

## Run

    docker-compose up
    
## Track Types


### Blocked

    localhost:3000/s.png?b=1
    
### Not Blocked

    localhost:3000/s.png?b=0
    
### No Script

    localhost:3000/s.png?b=2
    
## Statistics

    http://localhost:3000/stats

```json
{
  "0":{"sum":"3","byReferer":["www.businessinsider.de","3"],"byUserAgent":["Chrome","3"]},
  "1":{"sum":"15","byReferer":["www.businessinsider.de","7"],"byUserAgent":["Chrome","15"]},
  "2":{"sum":"4","byReferer":["www.businessinsider.de","4"],"byUserAgent":["Chrome","4"]}
}

```