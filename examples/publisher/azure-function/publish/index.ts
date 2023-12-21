import * as path from "path";
import * as fs from "fs";
import { InversifyInjector } from "@paperbits/common/injection";
import { IPublisher } from "@paperbits/common/publishing";
import { CorePublishModule } from "@paperbits/core/core.publish.module";
import { FormsModule } from "@paperbits/forms/forms.module";
import { ApimPublishModule } from "../../../../src/apim.publish.module";
import { StylePublishModule } from "@paperbits/styles/styles.publish.module";
import { ConsoleLogger } from "@paperbits/common/logging";
import { StaticSettingsProvider } from "../../../../src/components/staticSettingsProvider";
import { PublishingCacheModule } from "../../../../src/persistence/publishingCacheModule";
import { FileSystemBlobStorage } from "../../../../src/components/filesystemBlobStorage";
import { HttpRequest, HttpResponse, InvocationContext, app  } from "@azure/functions"


export async function publish(request:HttpRequest): Promise<void> {
    /* Reading settings from configuration file */
    const configFile = path.resolve(__dirname, "./config.json");
    const configuration = JSON.parse(fs.readFileSync(configFile, "utf8").toString());

    const settingsProvider = new StaticSettingsProvider({
        managementApiUrl: configuration.managementApiUrl,
        managementApiVersion: configuration.managementApiVersion,
        managementApiAccessToken: configuration.managementApiAccessToken,
        blobStorageContainer: configuration.outputBlobStorageContainer,
        blobStorageConnectionString: configuration.outputBlobStorageConnectionString,
        environment: "publishing"
    });

    const outputSettingsProvider = new StaticSettingsProvider({
        blobStorageContainer: configuration.outputBlobStorageContainer,
        blobStorageConnectionString: configuration.outputBlobStorageConnectionString
    });

    const body:any = await request.json();

    const outputBlobStorage = new FileSystemBlobStorage(path.join("./dist/function/" + body.name))

    const injector = new InversifyInjector();
    injector.bindModule(new CorePublishModule());
    injector.bindModule(new StylePublishModule());
    injector.bindModule(new FormsModule());
    injector.bindModule(new ApimPublishModule());
    injector.bindInstance("settingsProvider", settingsProvider);
    injector.bindInstance("outputBlobStorage", outputBlobStorage);
    injector.bindModule(new PublishingCacheModule());
    injector.resolve("autostart");

    const publisher = injector.resolve<IPublisher>("sitePublisher");
    await publisher.publish();
}

export async function run(request:HttpRequest, context:InvocationContext): Promise<HttpResponse> {
    try {
        context.log("Publishing website...");
        await publish(request);
        context.log("Done.");

        return new HttpResponse({
            status: 200,
            body: "Done."
        })  ;
    }
    catch (error) {
        context.error(error);

        return new HttpResponse({
            status: 500,
            body: JSON.stringify(error)
        });
    }
    finally {
        context.log("Done!");
    }
}

app.http("publisher", {
    methods:['POST'],
    authLevel: "anonymous",
    handler: run
})