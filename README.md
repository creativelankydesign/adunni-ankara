# Adùnní Ankara

A demo storefront for a Lagos brand of handmade Ankara womenswear.

- **The rail**: a 3D clothes rack where each garment is a cloth simulation. It sways, reacts to the cursor and ripples when touched.
- **Try it on**: every piece opens on a 3D dress form sized UK 6–26. You can turn it to the front, side or back, or twirl it.
- **Shopping**: prices in naira, a bag, and a Nigerian checkout (36 states + FCT, delivery options). Payment is a Paystack/Flutterwave test-mode placeholder, or you can order on WhatsApp.

Built with Vite, React, three.js and @react-three/fiber.

```bash
npm install
npm run dev
```

The garments on the rail are cut out of model photos from [Pexels](https://www.pexels.com) with `tools/cutout.py`. That script runs rembg's `u2net_cloth_seg` model, then removes hands and fills the gaps with matching cloth. This is a demo: no real payments are taken, and the products and prices are placeholders.
