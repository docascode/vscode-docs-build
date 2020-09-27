# Performance benchmark

> Notes:
> 1. On the first build of a Docs repository on your local machine, all the dependencies (template repository, Cross Repository Reference, build dependencies, etc.) will need to be fetched, and this will take some time to complete (depending on your network).
> 2. All of the fetched resources will be cached locally, and additional local builds will run much faster.
> 3. A restore will be performed on each VS Code session (VS Code).

## Windows

> Device Spec(Surface Book2):  
> - CPU: 1.9GHz 4 Cores Intel Core i7-8650U
> - Memory: 16GB 1867 MHz DDR4  
> - Storage: SSD  
> - Battery settings: Power mode(plugged in): Best performance

| azure-docs-pr | docs | edge-developer | sql-docs-pr |
|  --- | --- | --- | --- |
| 00:01:22 | 00:00:48 | 00:00:03 | 00:01:07 |

## Mac

> Device Spec(MacBook Pro):  
> - CPU: 2.2GHz 6 Cores Intel Core i7  
> - Memory: 32GB 2400 MHz DDR4  
> - Storage: SSD  

| azure-docs-pr | docs | edge-developer | sql-docs-pr |
|  --- | --- | --- | --- |
| 00:00:50 | 00:00:38 | 00:00:03 | 00:00:54 |
