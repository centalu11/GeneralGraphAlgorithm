import Express from "express";
import routes from "./routes";

const PORT = 8080;
const HOST = "127.0.0.1";

const app = Express();
app.use(Express.json());
app.use("/", routes);

app.listen(PORT, HOST, () => {
  console.log("App Started at PORT 8080");
});
