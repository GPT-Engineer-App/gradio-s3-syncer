# Welcome to your GPT Engineer project

## Project info

**Project**: gradio-s3-syncer 

**URL**: https://run.gptengineer.app/projects/87e47a5d-5eaa-4926-bb42-afad25177e70/improve

**Description**: Here is the python code of my connection to gradio_app please migrate it your style:
import os
import json
import yaml
from typing import AnyStr, List, Tuple, Dict
import boto3
from dotenv import load_dotenv
import gradio as gr
from s3_manager import S3Manager
from vdb_manager import VDBManager
from langchain_openai import OpenAIEmbeddings


class S3GradioApp:

    def __init__(self, s3_manager: S3Manager, vdb_manager: VDBManager,
                 bucket_name: str):
        self.s3_manager = s3_manager
        self.vdb_manager = vdb_manager
        self.bucket_name = bucket_name
        self.json_folder = "json_folder"
        self.description_folder = "description_folder"
        self.image_folder = "image_folder"
        self.json_list = self.list_files(self.json_folder)
        self.description_list = self.list_files(self.description_folder)
        self.image_list = self.list_files(self.image_folder)
        self.config_folder = "config_folder"
        self.customer_folder = "customer_files"

    def load_config(self):
        self.download_file(self.config_folder,
                           f"{self.customer_name}_config.yaml", "./tmp")
        with open(f"./tmp/{self.customer_name}_config.yaml", 'r') as file:
            config_file = yaml.safe_load(file)

        return config_file

    def upload_file(self, files, folder):
        try:
            for file in files:
                self.s3_manager.add(
                    self.bucket_name,
                    file.name,
                    os.path.join(
                        folder,
                        f"{self.customer_name}_{os.path.basename(file.name)}"),
                )
            self.__update_files_list()

            gr.Info("File uploaded successfully")
            self.json_list = self.list_files(self.json_folder)
            if "json" in folder:
                choices = self.json_list
            elif "description" in folder:
                choices = self.description_list
            elif 'image' in folder:
                choices = self.image_list
            return [
                gr.File(label="Upload File", value=None),
                gr.Dropdown(choices=choices),
                gr.Dropdown(
                    label="List of files in S3",
                    choices=self.__s3_property_names(),
                    multiselect=True,
                    interactive=True,
                    render=True,
                )
            ]
        except Exception as e:
            print(e)

    def remove_file(self, files: gr.Dropdown, folder: gr.Textbox):
        try:
            for file in files:
                print(bucket_name, os.path.join(folder, file))
                self.s3_manager.remove(bucket_name, os.path.join(folder, file))

            gr.Info("File(s) removed successfully")
            self.__update_files_list()
            if "json" in folder:
                choices = self.json_list
            elif "description" in folder:
                choices = self.description_list
            elif 'image' in folder:
                choices = self.image_list

            return gr.Dropdown(choices=choices)
        except Exception as e:
            print(e)

    def list_files(self, folder):
        try:
            files = self.s3_manager.list_files(
                self.bucket_name, f"{folder}/{self.customer_name}")
            return files
        except Exception as e:
            print(e)

    def __list_collections(self):
        return self.vdb_manager._list_collections()

    def create_collection(self, collection_name):
        msg = self.vdb_manager.create_collection(collection_name)
        gr.Info(msg)
        return gr.Dropdown(
            label="List of Collections",
            choices=self.__list_collections(),
            multiselect=False,
            interactive=True,
            render=True,
        )

    def add_data_to_vdb(
        self,
        collection_name: gr.Dropdown,
        s3_files: gr.Dropdown,
        all_s3_files: gr.Checkbox,
    ):
        # get file paths
        if all_s3_files:
            s3_files = self.__s3_property_names()

        # delete all these files from qdrant
        for file in s3_files:
            if file in self.vdb_manager.list_src(collection_name):
                self.vdb_manager.remove("property_id", file, collection_name)

        descs_paths, metadata_paths, img_urls = self.__download_property_files(
            s3_files)
        docs = []
        ids = []
        for desc_path, metadata_path in zip(descs_paths, metadata_paths):
            # ['./tmp/descriptions/Property_2250914.txt']
            property_name = os.path.splitext(os.path.basename(desc_path))[0]
            _docs, _ids = self.vdb_manager.process_property_doc(
                desc_path, metadata_path, img_urls.get(property_name, ['']))
            docs.extend(_docs)
            ids.extend(_ids)

        self.vdb_manager.add(docs, ids, collection_name)
        import shutil

        shutil.rmtree("./tmp/descriptions")
        shutil.rmtree("./tmp/metadatas")
        gr.Info("Files added to Vector Database.")
        return gr.Dropdown(label="List of Properties from Database",
                           choices=self.vdb_manager.list_src(collection_name),
                           interactive=True,
                           render=True)

    def __s3_property_names(self):
        return [json_file.split(".")[0]
                for json_file in self.json_list] if self.json_list else ['']

    def __update_files_list(self):
        try:
            self.json_list = self.list_files(self.json_folder)
            self.description_list = self.list_files(self.description_folder)
            self.image_list = self.list_files(self.image_folder)

        except Exception as e:
            print("__update_files_list", e)

    def download_file(self, folder, filename, save_dir):
        try:
            return self.s3_manager.download(self.bucket_name,
                                            f"{folder}/{filename}", save_dir)
        except Exception as e:
            return str(e)

    def __download_property_files(
            self, property_names
    ) -> Tuple[List[str], List[str], Dict[str, List[str]]]:
        local_description_folder = "./tmp/descriptions"
        local_metadata_folder = "./tmp/metadatas"
        local_imgs_folder = "./tmp/imgs"

        os.makedirs(local_description_folder, exist_ok=True)
        os.makedirs(local_metadata_folder, exist_ok=True)
        os.makedirs(local_imgs_folder, exist_ok=True)

        metadata_paths = []
        descriptions_paths = []

        for property_name in property_names:
            self.download_file(self.json_folder, f"{property_name}.json",
                               local_metadata_folder)
            self.download_file(
                self.description_folder,
                f"{property_name}.txt",
                local_description_folder,
            )
            metadata_paths.append(
                os.path.join(local_metadata_folder, property_name + ".json"))
            descriptions_paths.append(
                os.path.join(local_description_folder, property_name + ".txt"))
        imgs_urls = {}
        for idx, property_name in enumerate(property_names):
            list_imgs = self.list_files(self.image_folder +
                                        f"/{property_name}")
            urls = []
            for img in list_imgs:
                url = f'https://s3.amazonaws.com/{self.bucket_name}/{self.image_folder}/{img}'
                urls.append(url)

            imgs_urls[f"{property_name}"] = urls

        print(">>>>>>>>>>>>>", metadata_paths)
        print(">>>>>>>>>>>>>", descriptions_paths)
        print(">>>>>>>>>>>>>", imgs_urls)
        return descriptions_paths, metadata_paths, imgs_urls

    def __verify_user(self, username, password):
        with open("./credentials.json", "r") as f:
            creds = json.load(f)
        for cred in creds:
            if cred["username"] == username and cred["password"] == password:
                self.customer_name = username
                self.config = self.load_config()
                self.__update_files_list()
                return True
        return False

    def _process_zip_file(self, file):
        """upload to s3"""
        self.upload_file(file, self.customer_folder)
        gr.Info("Zip file uploaded to S3 bucket")

    def set_db_url(self, DB_URL):
        os.environ["DB_URL"] = DB_URL
        gr.Info("DB URL Added")

    def set_db_api_key(self, DB_API_KEY):
        os.environ["DB_API_KEY"] = DB_API_KEY
        gr.Info("DB API KEY Added")

    def set_openai_api_key(self, OPENAI_API_KEY):
        os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
        gr.Info("OPENAI API KEY Added")

    def __update_vector_docs(self, collection_name):
        print("IN IT ...................")
        print(self.__s3_property_names())
        return (gr.Dropdown(
            label="List of files in S3",
            choices=self.__s3_property_names(),
            multiselect=True,
            interactive=True,
            render=True,
        ),
                gr.Dropdown(
                    label="List of Properties from Database",
                    choices=self.vdb_manager.list_src(collection_name),
                ))

    def generate_report(self):
        print(self.config)
        collection_name = self.config['db']['collection_name']
        return (gr.Textbox(label="Collection Name", value=collection_name),
                gr.Textbox(
                    label=f"Number of Points in {collection_name}",
                    value=self.vdb_manager.total_points(collection_name)),
                gr.Dropdown(
                    label='Files in Database',
                    choices=self.vdb_manager.list_src(collection_name), interactive=True, render=True))

    def __refresh_json_list(self, ):
        self.__update_files_list()
        return gr.Dropdown(
            label="List of JSON in S3(Select to remove)",
            choices=self.json_list,
            multiselect=True,
            interactive=True,
            render=True,
        )

    def __refresh_desc_list(self, ):
        self.__update_files_list()
        return gr.Dropdown(
            label="List of description in S3(Select to remove)",
            choices=self.description_list,
            multiselect=True,
            interactive=True,
            render=True,
        )

    def __refresh_images_list(self, ):
        self.__update_files_list()
        return gr.Dropdown(
            label="List of images in S3(Select to remove)",
            choices=self.image_list,
            multiselect=True,
            interactive=True,
            render=True,
        )

    def launch_app(self):
        with gr.Blocks() as demo:

            log_out_button = gr.Button(value="Log Out",
                                       visible=True,
                                       link="/logout",
                                       size='sm')

            with gr.Tabs():
                with gr.Tab(label="S3 Operations"):
                    with gr.TabItem("JSON Files"):
                        with gr.Row():
                            with gr.Column():
                                json_file_upload = gr.File(
                                    label="Upload JSON File",
                                    file_count="multiple")
                                upload_json_button = gr.Button("Upload JSON")
                                print("while we render....", self.json_list)

                                with gr.Row():
                                    json_list_to_remove = gr.Dropdown(
                                        label=
                                        "List of JSON in S3(Select to remove)",
                                        choices=self.json_list,
                                        multiselect=True,
                                        interactive=True,
                                        render=True,
                                    )
                                    refresh_button_json = gr.Button(
                                        icon="./images.jpeg", size='sm')
                                remove_json_button = gr.Button("Remove JSON")

                    with gr.TabItem("Description Files"):
                        with gr.Row():
                            with gr.Column():
                                description_file_upload = gr.File(
                                    label="Upload description File",
                                    file_count="multiple")
                                upload_description_button = gr.Button(
                                    "Upload description")
                                print("while we render....",
                                      self.description_list)
                                with gr.Row():
                                    description_list_to_remove = gr.Dropdown(
                                        label=
                                        "List of description in S3(Select to remove)",
                                        choices=self.description_list,
                                        multiselect=True,
                                        interactive=True,
                                        render=True,
                                    )
                                    refresh_button_desc = gr.Button(
                                        icon="./images.jpeg", size='sm')

                                remove_description_button = gr.Button(
                                    "Remove description")

                    with gr.TabItem("ImagesFiles"):
                        with gr.Row():
                            with gr.Column():
                                image_file_upload = gr.File(
                                    label="Upload Image",
                                    file_count="multiple")
                                upload_image_button = gr.Button("Upload")
                                with gr.Row():
                                    image_list_to_remove = gr.Dropdown(
                                        label=
                                        "List of images in S3(Select to remove)",
                                        choices=self.image_list,
                                        multiselect=True,
                                        interactive=True,
                                        render=True,
                                    )
                                    refresh_button_images = gr.Button(
                                        icon="./images.jpeg", size='sm')
                                remove_image_button = gr.Button("Remove Image")

                with gr.Tab(label="Vector DB Operations"):
                    with gr.Row():
                        with gr.Column():
                            # add collection:
                            _collection_name = gr.Textbox(
                                label="Create Collection",
                                placeholder="Collection Name")
                            add_collection_button = gr.Button(
                                value="Create Collection")

                        with gr.Column():
                            # List the collections
                            selected_collection_name_vdb = gr.Dropdown(
                                label="List of Collections",
                                choices=self.__list_collections(),
                                multiselect=False,
                                interactive=True,
                                render=True,
                            )

                            s3_files_list = gr.Dropdown(
                                label="List of Properties from S3",
                                choices=self.__s3_property_names(),
                                multiselect=True,
                                interactive=True,
                                render=True,
                            )
                            vdb_files_list = gr.Dropdown(
                                label="List of Properties from Database",
                                choices=self.vdb_manager.list_src(
                                    selected_collection_name_vdb.value),
                                interactive=True,
                                render=True)
                            select_all_s3_files = gr.Checkbox(
                                label="Select All S3 properties")
                            embed_chunk_button = gr.Button(
                                value="Embed and Chunk Files")

                            print("while we render....", self.description_list)

                with gr.Tab(label="Customer View"):
                    with gr.Column():
                        with gr.Row():
                            user_name = gr.Textbox(
                                label="Name", placeholder="Enter your name:")
                        with gr.Column():
                            upload_file = gr.File(label="Upload a Zip File")
                            upload_file_button = gr.Button(
                                value="Upload file to Storage(S3)")

                with gr.Tab(label="Report"):
                    gr.Markdown(value=f"""
                    # Database Report
                    """)
                    get_report = gr.Button(value="Get Report")
                    with gr.Row():
                        with gr.Column():
                            selected_collection_name = gr.Textbox(
                                label='Collection Name from Config')
                            num_database_points = gr.Textbox(
                                label='Number of Points')
                            file_names = gr.Dropdown(
                                label='List of Properties')

            # Report Generation
                get_report.click(self.generate_report,
                                 outputs=[
                                     selected_collection_name,
                                     num_database_points, file_names
                                 ])

                # Customer View
                upload_file_button.click(self._process_zip_file,
                                         inputs=upload_file)

                # S3 OPERATIONS
                # FOR JSON FILE
                upload_json_button.click(
                    self.upload_file,
                    inputs=[
                        json_file_upload,
                        gr.Textbox(value=self.json_folder, visible=False),
                    ],
                    outputs=[
                        json_file_upload, json_list_to_remove, s3_files_list
                    ],
                )
                remove_json_button.click(
                    self.remove_file,
                    inputs=[
                        json_list_to_remove,
                        gr.Textbox(self.json_folder, visible=False),
                    ],
                    outputs=json_list_to_remove,
                )
                refresh_button_json.click(
                    self.__refresh_json_list,
                    outputs=json_list_to_remove,
                )
                # FOR DESCRIPTION FILE

                upload_description_button.click(
                    self.upload_file,
                    inputs=[
                        description_file_upload,
                        gr.Textbox(value=self.description_folder,
                                   visible=False),
                    ],
                    outputs=[
                        description_file_upload, description_list_to_remove,
                        s3_files_list
                    ],
                )
                remove_description_button.click(
                    self.remove_file,
                    inputs=[
                        description_list_to_remove,
                        gr.Textbox(self.description_folder, visible=False),
                    ],
                    outputs=description_list_to_remove,
                )
                refresh_button_desc.click(
                    self.__refresh_desc_list,
                    outputs=description_list_to_remove,
                )

                # FOR IMAGES

                upload_image_button.click(
                    self.upload_file,
                    inputs=[
                        image_file_upload,
                        gr.Textbox(value=self.image_folder, visible=False),
                    ],
                    outputs=[image_file_upload, image_list_to_remove],
                )
                remove_image_button.click(
                    self.remove_file,
                    inputs=[
                        image_list_to_remove,
                        gr.Textbox(self.image_folder, visible=False),
                    ],
                    outputs=image_list_to_remove,
                )
                refresh_button_images.click(
                    self.__refresh_images_list,
                    outputs=image_list_to_remove,
                )

                # ---------------------------
                # Vector DB Operations
                selected_collection_name_vdb.select(
                    self.__update_vector_docs,
                    inputs=[selected_collection_name_vdb],
                    outputs=[s3_files_list, vdb_files_list],
                )

                embed_chunk_button.click(self.add_data_to_vdb,
                                         inputs=[
                                             selected_collection_name_vdb,
                                             s3_files_list,
                                             select_all_s3_files,
                                         ],
                                         outputs=[vdb_files_list])

                add_collection_button.click(
                    self.create_collection,
                    inputs=[_collection_name],
                    outputs=selected_collection_name_vdb,
                )
        demo.launch(auth=self.__verify_user, share=True)


if __name__ == "__main__":
    load_dotenv("./.env")

    with open("./config.yaml", "r") as file:
        config = yaml.safe_load(file)
    embeddings = OpenAIEmbeddings(api_key=os.environ["OPENAI_API_KEY"])
    s3_manager = S3Manager(
        access_key=os.environ["AWS_ACCESS_KEY_ID"],
        secret_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    vdb_manager = VDBManager(os.environ["DB_API_KEY"], os.environ["DB_URL"],
                             embeddings)

    bucket_name = os.environ["AWS_STORAGE_BUCKET_NAME"]

    app = S3GradioApp(s3_manager, vdb_manager, bucket_name)
    app.launch_app()
 

## Who is the owner of this repository?
By default, GPT Engineer projects are created with public GitHub repositories.

However, you can easily transfer the repository to your own GitHub account by navigating to your [GPT Engineer project](https://run.gptengineer.app/projects/87e47a5d-5eaa-4926-bb42-afad25177e70/improve) and selecting Settings -> GitHub. 

## How can I edit this code?
There are several ways of editing your application.

**Use GPT Engineer**

Simply visit the GPT Engineer project at [GPT Engineer](https://run.gptengineer.app/projects/87e47a5d-5eaa-4926-bb42-afad25177e70/improve) and start prompting.

Changes made via gptengineer.app will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in the GPT Engineer UI.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps: 

```sh
git clone https://github.com/GPT-Engineer-App/gradio-s3-syncer.git
cd gradio-s3-syncer
npm i

# This will run a dev server with auto reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

All GPT Engineer projects can be deployed directly via the GPT Engineer app. 

Simply visit your project at [GPT Engineer](https://run.gptengineer.app/projects/87e47a5d-5eaa-4926-bb42-afad25177e70/improve) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain, then we recommend GitHub Pages.

To use GitHub Pages you will need to follow these steps: 
- Deploy your project using GitHub Pages - instructions [here](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#creating-your-site)
- Configure a custom domain for your GitHub Pages site - instructions [here](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)