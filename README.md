I'm experimenting with how to visualise the geodesics in spacetime under general relativity. Please help with suggestions!

Live demo: https://timhutton.github.io/GravityIsNotAForce/
[![image](https://user-images.githubusercontent.com/647092/108274554-f540bf80-716c-11eb-865d-a7e557a287ad.png)](https://timhutton.github.io/GravityIsNotAForce/)

**Description:** Under general relativity, gravity is not a force - instead it is a distortion of spacetime. Objects in free-fall move along geodesics (straight lines) in spacetime, as seen in the inertial frame of reference on the right. When standing on Earth we experience a frame of reference that is accelerating upwards, causing objects in free-fall to move along parabolas, as seen on the left. [More...](https://timhutton.github.io/GravityIsNotAForce/)

[Version with more space dimensions:](https://timhutton.github.io/GravityIsNotAForce/constant_gravity_4d.html)
[![image](https://user-images.githubusercontent.com/647092/108274529-ece88480-716c-11eb-827d-2c0c3d510179.png)](https://timhutton.github.io/GravityIsNotAForce/constant_gravity_4d.html)

[Version that is accurate in a varying gravitational field:](https://timhutton.github.io/GravityIsNotAForce/variable_gravity.html)
[![image](https://user-images.githubusercontent.com/647092/108274429-cd515c00-716c-11eb-922f-80ab98b18fd1.png)](https://timhutton.github.io/GravityIsNotAForce/variable_gravity.html)

History:
- 2020-10-19: First version released. Triggered discussions here:
    - Hacker News: [https://news.ycombinator.com/item?id=24821141](https://news.ycombinator.com/item?id=24821141)
    - Reddit r/physics: [https://www.reddit.com/r/Physics/comments/jdqlzf/gravity_is_not_a_force_freefall_parabolas_are/](https://www.reddit.com/r/Physics/comments/jdqlzf/gravity_is_not_a_force_freefall_parabolas_are/)
    - Twitter: [https://twitter.com/\_tim_hutton\_/status/1317923535105478656](https://twitter.com/_tim_hutton_/status/1317923535105478656)
- 2020-11-01: Added [more complex view](https://timhutton.github.io/GravityIsNotAForce/constant_gravity_4d.html) tackling the cases of 2+1 and 3+1 with constant-gravity.
- 2020-11-17: Added [version with varying gravity](https://timhutton.github.io/GravityIsNotAForce/variable_gravity.html) implementing [Rickard Jonsson's](http://www.relativitet.se/) [2001 paper](http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf).

History of the ideas: (please help fill in the gaps!)
- 1985: The book [Relativity Visualized](https://books.google.de/books?id=lwZBAQAAIAAJ) by Lewis Carroll Epstein shows how [bending spacetime can make straight lines out of parabolas](http://demoweb.physics.ucla.edu/content/10-curved-spacetime).
- 2001: [Rickard Jonsson](http://www.relativitet.se/) publishes [a paper](http://www.relativitet.se/Webarticles/2001GRG-Jonsson33p1207.pdf) that tackles the issue in a different way.
- 2013: A [YouTube video](https://www.youtube.com/watch?v=DdC0QN6f3G4) animates the parabolas idea, citing Epstein's book.
- 2014: A [YouTube video](https://www.youtube.com/watch?v=jlTVIMOix3I) by Edward Current showed a physical 'spacetime stretcher'.
- 2019: A [paper](https://iopscience.iop.org/article/10.1088/1361-6552/ab08f5/pdf) by Magdalena Kersting references that youtube video and commends the approach to educators. A [follow-up paper](https://iopscience.iop.org/article/10.1088/1361-6552/ab56d7/pdf) discusses the limitations of the model.

TO-DO list:
- Can we extend to 2+1 with a point mass? Perhaps by considering a single geodesic (e.g. an elliptic orbit) as a straight line and drawing the rest of the universe as a (possibly very strange) distorted grid around that geodesic?
