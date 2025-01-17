import "./NeedleConfigPanel.css";
import { jsPDF } from "jspdf";
import companiesData from "./data/companies.json"; // Import companies.json
import dhagaData from "./data/dhaga.json"; // Import dhaga.json
import materialsData from "./data/materials.json"; // Import materials.json
import sizesData from "./data/sizes.json"; // Import sizes.json
import { saveAs } from "file-saver"; // Import file-saver for saving files

import { useState, useEffect, useCallback } from "react";
import { openDatabase } from "./indexedDB"; // Import the openDatabase function
import Select from "react-select"; // Import react-select

const NeedleConfigPanel = () => {
  const [totalNeedles, setTotalNeedles] = useState(6);
  const [sequenceNeedleIndex, setSequenceNeedleIndex] = useState(null);
  const [needles, setNeedles] = useState(
    Array(6)
      .fill(null)
      .map(() => ({
        type: null,
        sequenceType: [],
        threadCompany: "",
        threadColor: "",
        isActive: false,
        threadColorOptions: [], // Initialize threadColorOptions
      }))
  );
  const [isConfigurationSaved, setIsConfigurationSaved] = useState(false);
  const [companies, setCompanies] = useState([]); // State for companies
  const [colors, setColors] = useState([]); // State for colors based on selected company
  const [selectedCompany, setSelectedCompany] = useState(""); // State for selected company
  const [threadColorOptions, setThreadColorOptions] = useState([]); // State for thread color options
  const [selectedOptions, setSelectedOptions] = useState(() =>
    Array(6)
      .fill(null)
      .map(() => ({
        A: ["", ""],
        B: ["", ""],
        C: ["", ""],
        D: ["", ""],
        E: ["", ""],
        F: ["", ""],
      }))
  );
  const [materials, setMaterials] = useState([]); // State for materials
  const [sizes, setSizes] = useState([]); // State for sizes
  const [designName, setDesignName] = useState(""); // State for design name
  const [existingDesigns, setExistingDesigns] = useState([]); // State for existing designs
  const [selectedDesign, setSelectedDesign] = useState(""); // State for selected design
  const [dhagas, setDhagas] = useState([]);

  // Thread Company Options
  const threadCompanyOptions = ["Gutermann", "DMC", "Madeira"];

  // Convert companies and dhagas to options format for react-select
  const companyOptions = companies.map((company) => ({
    value: company.code,
    label: company.name,
  }));

  const dhagaOptions = dhagas.map((dhaga) => ({
    value: dhaga.code,
    label: dhaga.name,
  }));

  // Get needle card background color
  const getNeedleColor = (index) => {
    if (index === sequenceNeedleIndex) return "bg-green-100";
    if (needles[index].type === "Thread") return "bg-blue-100";
    return "bg-gray-100";
  };

  // Handle total needle count change
  const handleTotalNeedleChange = (e) => {
    const count = parseInt(e.target.value);
    setTotalNeedles(count);

    // Preserve existing needle configurations when possible
    const newNeedles = Array(count)
      .fill(null)
      .map(() => ({
        type: null,
        sequenceType: [],
        threadCompany: "",
        threadColor: "",
        isActive: false,
        threadColorOptions: [], // Initialize threadColorOptions
      }));

    // Copy existing configurations
    needles.forEach((needle, index) => {
      if (index < count) {
        newNeedles[index] = { ...needle };
      }
    });

    // Update selectedOptions array when total needles change
    const newSelectedOptions = Array(count)
      .fill(null)
      .map((_, index) => {
        // Preserve existing options if available
        if (index < selectedOptions.length) {
          return selectedOptions[index];
        }
        // Create new default options for additional needles
        return {
          A: ["", ""],
          B: ["", ""],
          C: ["", ""],
          D: ["", ""],
          E: ["", ""],
          F: ["", ""],
        };
      });

    setSelectedOptions(newSelectedOptions);
    setNeedles(newNeedles);
    setSequenceNeedleIndex(null);
    setIsConfigurationSaved(false);
  };

  // Handle sequence needle selection
  const handleSequenceNeedleChange = (e) => {
    const index = parseInt(e.target.value);
    setSequenceNeedleIndex(index);

    const updatedNeedles = needles.map((needle, idx) => ({
      ...needle,
      type: idx === index ? "Sequence" : "Thread",
      isActive: true,
    }));

    setNeedles(updatedNeedles);
    setIsConfigurationSaved(false);
  };

  // Update individual needle configuration
  const updateNeedleConfig = (index, field, value) => {
    const updatedNeedles = [...needles];
    updatedNeedles[index] = {
      ...updatedNeedles[index],
      [field]: value,
    };
    setNeedles(updatedNeedles);
    setIsConfigurationSaved(false);
  };

  // Handle sequence type selection
  const handleSequenceTypeChange = (selectedType, index) => {
    const updatedNeedles = [...needles];
    const sequenceTypes = updatedNeedles[index].sequenceType;

    if (sequenceTypes.includes(selectedType)) {
      updatedNeedles[index].sequenceType = sequenceTypes.filter(
        (type) => type !== selectedType
      );
    } else {
      updatedNeedles[index].sequenceType = [...sequenceTypes, selectedType];
    }

    setNeedles(updatedNeedles);
    console.log("Updated needles:", updatedNeedles); // Debug log
    setIsConfigurationSaved(false); // Mark configuration as unsaved
  };

  // Function to generate dynamic output for A, B, C, D, E, F
  const generateOutput = () => {
    const output = {};
    const labels = ["A", "B", "C", "D", "E", "F"];

    labels.forEach((label) => {
      const index = sequenceNeedleIndex; // Assuming sequence needle index is used for selection
      // console.log("Selected Options:", selectedOptions); // Debug log for selectedOptions
      const material = selectedOptions[index][label][2]; // Material
      const size = selectedOptions[index][label][3]; // Size

      if (material && size) {
        output[label] = {
          material: material,
          size: size,
        };
      }
    });

    return output;
  };

  // Handle save configuration
  const handleSave = async () => {
    if (!designName.trim()) {
      alert("Please provide a design name.");
      return;
    }

    try {
      const db = await openDatabase();
      const transaction = db.transaction("designs", "readwrite");
      const store = transaction.objectStore("designs");

      // Create new design object with all configurations
      const newDesign = {
        designName: designName.trim(),
        totalNeedles,
        sequenceNeedleIndex,
        needles: needles.map((needle, index) => {
          if (index === sequenceNeedleIndex) {
            return {
              sequenceType: needle.sequenceType,
              selectedOptions: selectedOptions[index] // Save sequence options
            };
          } else {
            return {
              threadCompany: needle.threadCompany,
              threadColor: needle.threadColor,
            };
          }
        }),
        // selectedOptions // Save all selected options
      };

      console.log("Saving design:", newDesign);

      await new Promise((resolve, reject) => {
        const request = store.put(newDesign);
        request.onsuccess = () => {
          console.log("Design saved successfully");
          setIsConfigurationSaved(true);
          loadDesigns();
          resolve();
        };
        request.onerror = (event) => {
          console.error("Error saving design:", event.target.error);
          reject(event.target.error);
        };
      });

      updatePrintPreview();
    } catch (error) {
      console.error("Error saving design:", error);
      alert("Failed to save design. Please try again.");
    }
  };

  // Separate function for updating print preview
  const updatePrintPreview = () => {
    const printPreviewElement = document.getElementById("printPreview");
    if (printPreviewElement) {
      printPreviewElement.innerHTML = `
            <p>Total Needles: ${totalNeedles}</p>
            <p>Sequence Needle Index: ${
              sequenceNeedleIndex !== null ? sequenceNeedleIndex + 1 : "Not Set"
            }</p>
            ${needles
              .map(
                (needle, index) => {
                  if (index === sequenceNeedleIndex) {
                    return `<p>Needle ${index + 1}: 
                              Type - ${needle.type}, 
                              Sequence Type - ${needle.sequenceType.join(", ") || "Not Set"}
                            </p>`;
                  } else {
                    return `<p>Needle ${index + 1}: 
                              Thread Company - ${needle.threadCompany || "Not Set"}, 
                              Thread Color - ${needle.threadColor || "Not Set"}
                            </p>`;
                  }
                }
              )
              .join("")}
        `;
    }
  };

  // Separate function for loading designs
  const loadDesigns = async () => {
    try {
      const db = await openDatabase();
      const transaction = db.transaction("designs", "readonly");
      const store = transaction.objectStore("designs");

      const designs = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      setExistingDesigns(designs);
    } catch (error) {
      console.error("Error loading designs:", error);
    }
  };

  // Function to save data to a file
  const saveToFile = (fileName, data) => {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName; // Set the file name
    document.body.appendChild(a);
    a.click(); // Trigger the download
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up the URL object
  };

  // This function is to print the configuration details in A4 Print Button
  const handleA4Print = (type) => {
    if (!isConfigurationSaved) {
      alert("Please save the configuration before printing.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Title
    doc.setFont("Poppins", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(`Needle Configuration`, pageWidth / 2, 20, { align: "center" });

    // Add a horizontal line below the title
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(10, 25, pageWidth - 10, 25);

    // Summary Section
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("Configuration Summary:", 10, 35);

    doc.setFont("Montserrat", "bold");
    doc.setFontSize(12);
    doc.text(`Design Name: ${designName}`, 10, 45); // Added space below Design Name
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(12);
    doc.text(`Total Needles: ${totalNeedles}`, 10, 55); // Adjusted Y position for spacing
    doc.text(
      `Sequence Needle Index: ${
        sequenceNeedleIndex !== null ? sequenceNeedleIndex + 1 : "Not Set"
      }`,
      10,
      60 // Adjusted Y position for spacing
    );

    // Add space before needle details
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(14);
    doc.text("Needle Details:", 10, 70);

    // Needle Details Section
    let yPos = 80;
    needles.forEach((needle, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont("Montserrat", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`Needle ${index + 1}:`, 15, yPos);

      doc.setFont("Montserrat", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      yPos += 5;

      if (index === sequenceNeedleIndex) {
        // Print sequence needle details
        doc.text(`Type: Sequence`, 20, yPos);
        yPos += 5;
        
        if (needle.sequenceType.length > 0) {
          doc.text(`Sequence Types: ${needle.sequenceType.join(", ")}`, 20, yPos);
          yPos += 5;
        }

        // Print sequence configuration (A-F)
        const options = selectedOptions[index];
        Object.entries(options).forEach(([key, value]) => {
          const material = materials.find(m => m.code === value[0])?.name || 'Not Set';
          const size = value[1] || 'Not Set';
          doc.text(`${key}: Material - ${material}, Size - ${size}`, 20, yPos);
          yPos += 5;
        });
        
      } else {
        // Print thread needle details
        doc.text(`Type: Thread`, 20, yPos);
        yPos += 5;
        doc.text(`Thread Company: ${needle.threadCompany || "Not Set"}`, 20, yPos);
        yPos += 5;
        doc.text(`Thread Color: ${needle.threadColor || "Not Set"}`, 20, yPos);
        yPos += 5;
      }

      yPos += 5; // Add extra spacing between needles
    });

    // Footer
    // doc.setFont('Montserrat', 'italic');
    // doc.setFontSize(10);
    // doc.setTextColor(100, 100, 100);
    // doc.text('Generated by Needle Configuration Panel', 10, pageHeight - 10);

    // Save the PDF
    doc.save(`NeedleConfiguration_${type}.pdf`);
  };

  // This function is to print the configuration details in Design Print Button
  const handleDesignPrint = (type) => {
    if (!isConfigurationSaved) {
      alert("Please save the configuration before printing.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const dividerX = pageWidth * (2 / 3);

    // Title
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(`${type} Configuration`, dividerX, 20);

    // // Add a vertical line on the right side
    // doc.setDrawColor(30, 30, 30);
    // doc.setLineWidth(0.5);
    // doc.line(dividerX, 10, dividerX, doc.internal.pageSize.height - 10);

    // Summary Section
    doc.setFont("Montserrat", "normal");
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);

    doc.setFontSize(12);
    doc.setFont("Montserrat", "bold"); // Set font to bold
    doc.text(`Total Needles: ${totalNeedles}`, dividerX, 30);
    doc.setFont("Montserrat", "bold"); // Reset font to normal
    doc.text(
      `Sequence Needle Index: ${
        sequenceNeedleIndex !== null ? sequenceNeedleIndex + 1 : "Not Set"
      }`,
      dividerX,
      35 // Increased spacing
    );

    // Add space before needle details
    doc.setFont("Montserrat", "bold");
    doc.setFontSize(14);
    doc.text("Needle Details:", dividerX, 45); // Adjusted Y position for spacing

    // Needle Details Section
    let yPos = 53;
    needles.forEach((needle, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 25;
        doc.line(dividerX, 10, dividerX, pageHeight - 10);
      }

      doc.setFont("Montserrat", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`Needle ${index + 1}:`, dividerX, yPos);
      yPos += 5;

      doc.setFont("Montserrat", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);

      if (index === sequenceNeedleIndex) {
        // Print sequence needle details
        doc.text(`Type: Sequence`, dividerX, yPos);
        yPos += 5;
        
        if (needle.sequenceType.length > 0) {
          doc.text(`Sequence Types: ${needle.sequenceType.map(type => `_${type}_`).join(", ")}`, dividerX, yPos);
          yPos += 5;
        }

        // Print sequence configuration (A-F)
        const options = selectedOptions[index];
        Object.entries(options).forEach(([key, value]) => {
          const material = materials.find(m => m.code === value[0])?.name || 'Not Set';
          const size = value[1] || 'Not Set';
          doc.text(`${key}: Material - ${material}, Size - ${size}`, dividerX, yPos);
          yPos += 5;
        });
        
      } else {
        // Print thread needle details  
        doc.text(`Type: Thread`, dividerX, yPos);
        yPos += 5;
        doc.text(`Thread Company: ${needle.threadCompany || "Not Set"}`, dividerX, yPos);
        yPos += 5;
        doc.text(`Thread Color: ${needle.threadColor || "Not Set"}`, dividerX, yPos);
        yPos += 5;
      }

      yPos += 5; // Add extra spacing between needles
    });

    // Footer (Optional)
    // doc.setFont('Montserrat', 'italic');
    // doc.setFontSize(10);
    // doc.setTextColor(100, 100, 100);
    // doc.text('Generated by Needle Configuration Panel', pageWidth - 45, pageHeight - 10, { align: 'right' });

    // Save the PDF
    doc.save(`NeedleConfiguration_${type}.pdf`);
  };

  // Reset all configurations
  const handleReset = () => {
    setTotalNeedles(6);
    setSequenceNeedleIndex(null);
    setNeedles(
      Array(6)
        .fill(null)
        .map(() => ({
          type: null,
          sequenceType: [],
          threadCompany: "",
          threadColor: "", // Changed from threadNumber to threadColor
          isActive: false,
          threadColorOptions: [], // Initialize threadColorOptions to an empty array
        }))
    );
    setIsConfigurationSaved(false);

    // Reset UI elements
    document
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => (input.checked = false));
    document
      .querySelectorAll("select")
      .forEach((select) => (select.selectedIndex = 0));
    document
      .querySelectorAll('input[type="text"], input[type="number"]')
      .forEach((input) => (input.value = ""));

    localStorage.removeItem("needleConfiguration");

    // Clear print preview
    const printPreviewElement = document.getElementById("printPreview");
    if (printPreviewElement) {
      printPreviewElement.innerHTML = "";
    }
  };

  // Combine related useEffects
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load saved configuration from localStorage
        const savedConfiguration = JSON.parse(
          localStorage.getItem("needleConfiguration")
        );
        if (savedConfiguration) {
          setTotalNeedles(savedConfiguration.totalNeedles);
          setSequenceNeedleIndex(savedConfiguration.sequenceNeedleIndex);
          setNeedles(savedConfiguration.needles);
          setIsConfigurationSaved(true);
        }

        // Load data from IndexedDB
        const db = await openDatabase();
        await Promise.all([
          fetchFromStore(db, "companies", setCompanies),
          fetchFromStore(db, "dhagas", setDhagas),
          fetchFromStore(db, "materials", setMaterials),
          fetchFromStore(db, "sizes", setSizes),
        ]);

        // Load existing designs
        await loadDesigns();
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, []);

  const fetchFromStore = (db, storeName, setState) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        setState(event.target.result);
        resolve();
      };

      request.onerror = (event) => {
        console.error(
          `Error retrieving ${storeName} from IndexedDB:`,
          event.target.error
        );
        reject(event.target.error);
      };
    });
  };

  // Handle company selection
  const handleCompanyChange = useCallback(
    (selectedOption, index) => {
      const selectedCode = selectedOption.value;

      setNeedles((prevNeedles) => {
        const updatedNeedles = [...prevNeedles];
        updatedNeedles[index] = {
          ...updatedNeedles[index],
          threadCompany: selectedCode,
          threadColor: "",
          threadColorOptions: dhagas.filter(
            (dhaga) => dhaga.company_code === selectedCode
          ),
        };
        return updatedNeedles;
      });
    },
    [dhagas]
  );

  useEffect(() => {
    const loadDesigns = async () => {
      const db = await openDatabase();
      const transaction = db.transaction("designs", "readonly");
      const store = transaction.objectStore("designs");
      const request = store.getAll();

      request.onsuccess = (event) => {
        const designs = event.target.result;
        setExistingDesigns(designs); // Set the existing designs in state
      };

      request.onerror = (event) => {
        console.error(
          "Error retrieving designs from IndexedDB:",
          event.target.error
        );
      };
    };

    loadDesigns();
  }, []);

  // Update the handleDesignSelect function
  const handleDesignSelect = (designName) => {
    if (!dhagas.length) {
      console.warn('Thread data not yet loaded');
      return;
    }

    setSelectedDesign(designName);
    const selected = existingDesigns.find(
      (design) => design.designName === designName
    );
    console.log("Selected design:", selected);

    if (selected) {
      setTotalNeedles(selected.totalNeedles);
      setSequenceNeedleIndex(selected.sequenceNeedleIndex);
      setDesignName(selected.designName);

      // Initialize needles with all configurations
      const initializedNeedles = Array(selected.totalNeedles)
        .fill(null)
        .map((_, index) => {
          const savedNeedle = selected.needles[index];
          
          if (index === selected.sequenceNeedleIndex) {
            // For sequence needle
            return {
              type: "Sequence",
              sequenceType: savedNeedle.sequenceType || [],
              threadCompany: "",
              threadColor: "",
              isActive: true,
              threadColorOptions: []
            };
          } else {
            // For thread needles
            const threadColorOptions = savedNeedle.threadCompany ? 
              dhagas.filter(dhaga => dhaga.company_code === savedNeedle.threadCompany) : 
              [];

            return {
              type: "Thread",
              sequenceType: [],
              threadCompany: savedNeedle.threadCompany || "",
              threadColor: savedNeedle.threadColor || "",
              isActive: true,
              threadColorOptions
            };
          }
        });

      setNeedles(initializedNeedles);

      // Initialize selectedOptions array
      const newSelectedOptions = Array(selected.totalNeedles)
        .fill(null)
        .map((_, index) => {
          if (index === selected.sequenceNeedleIndex) {
            // Get the saved sequence needle data
            const sequenceNeedle = selected.needles[index];
            
            // Create options object with saved values
            return {
              A: [
                sequenceNeedle.selectedOptions?.A?.[0] || "",
                sequenceNeedle.selectedOptions?.A?.[1] || ""
              ],
              B: [
                sequenceNeedle.selectedOptions?.B?.[0] || "",
                sequenceNeedle.selectedOptions?.B?.[1] || ""
              ],
              C: [
                sequenceNeedle.selectedOptions?.C?.[0] || "",
                sequenceNeedle.selectedOptions?.C?.[1] || ""
              ],
              D: [
                sequenceNeedle.selectedOptions?.D?.[0] || "",
                sequenceNeedle.selectedOptions?.D?.[1] || ""
              ],
              E: [
                sequenceNeedle.selectedOptions?.E?.[0] || "",
                sequenceNeedle.selectedOptions?.E?.[1] || ""
              ],
              F: [
                sequenceNeedle.selectedOptions?.F?.[0] || "",
                sequenceNeedle.selectedOptions?.F?.[1] || ""
              ]
            };
          } else {
            // For non-sequence needles, return default empty options
            return {
              A: ["", ""],
              B: ["", ""],
              C: ["", ""],
              D: ["", ""],
              E: ["", ""],
              F: ["", ""]
            };
          }
        });

      setSelectedOptions(newSelectedOptions);

      // Update the thread color options for thread needles
      initializedNeedles.forEach((needle, index) => {
        if (index !== selected.sequenceNeedleIndex && needle.threadCompany) {
          const threadColorOptions = dhagas.filter(
            dhaga => dhaga.company_code === needle.threadCompany
          );
          needle.threadColorOptions = threadColorOptions;
        }
      });

      // Force a re-render of the Select components
      setNeedles([...initializedNeedles]);

      // Mark configuration as saved since we just loaded it
      setIsConfigurationSaved(true);
    }
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="my-4 flex flex-row items-center">
        <div className="flex flex-row gap-4">
          <div className="flex flex-col items-start mt-4">
            <label className="block text-sm font-semibold text-gray-700 my-2">
              Select Existing Design
            </label>
            <select
              value={selectedDesign}
              onChange={(e) => handleDesignSelect(e.target.value)}
              className="mt-1 block w-full p-2 border rounded-button border-gray-300"
            >
              <option value="">Select a design</option>
              {existingDesigns.map((design) => (
                <option key={design.designName} value={design.designName}>
                  {design.designName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col items-start mt-4">
            <label className="block text-sm font-semibold text-gray-700 my-2">
              Design ID
            </label>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="mt-1 block w-full p-2 border rounded-button border-gray-300"
              placeholder="Enter design name"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center items-center">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-gray-900 font-montserrat">
              Needle Configuration Panel
            </h1>
            <p className="mt-2 text-gray-600 font-montserrat">
              Configure your embroidery machine needles for optimal performance
            </p>
          </div>
        </div>
      </header>

      <div className="flex gap-4 items-center justify-between w-full">
        <div className="flex flex-row gap-3">
          <div className="mt-4 flex flex-col items-start">
            <label className="block text-sm font-semibold text-gray-700 my-2">
              Select Total Needle
            </label>
            <select
              value={totalNeedles}
              onChange={handleTotalNeedleChange}
              className="mt-1 block w-48 p-2 border rounded-button border-gray-300"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} Needle{num > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex flex-col items-start">
            <label className="block text-sm font-semibold text-gray-700 my-2">
              Select Sequence Needle
            </label>
            <select
              value={sequenceNeedleIndex !== null ? sequenceNeedleIndex : ""}
              onChange={handleSequenceNeedleChange}
              className="mt-1 block w-48 p-2 border rounded-button border-gray-300"
            >
              <option value="" disabled>
                Select a needle
              </option>
              {Array(totalNeedles)
                .fill()
                .map((_, i) => (
                  <option key={i} value={i}>
                    {i + 1} Needle
                  </option>
                ))}
            </select>
          </div>
        </div>
        {/* Buttons */}
        <div className="flex flex-row justify-center gap-3 mt-10">
          <button
            className="!rounded-button bg-white border border-gray-300 px-4 py-2 h-10 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={handleReset}
          >
            Reset All
          </button>
          <button
            className="!rounded-button bg-custom px-4 py-2 h-10 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600"
            onClick={handleSave}
          >
            Save Configuration
          </button>
          {isConfigurationSaved && (
            <>
              <button
                className="!rounded-button bg-indigo-500 border border-gray-300 px-4 py-2 h-10 text-sm font-medium text-white hover:bg-indigo-600"
                onClick={() => handleA4Print("A4")}
              >
                A4 Print
              </button>
              <button
                className="!rounded-button bg-custom px-4 py-2 h-10 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600"
                onClick={() => handleDesignPrint("Design")}
              >
                Design Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Configuration Preview */}
      <div className="my-2 bg-white rounded-lg shadow-md shadow-gray-300 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuration Preview
        </h3>
        <div className="grid grid-cols-6 gap-3">
          {Array(totalNeedles)
            .fill()
            .map((_, index) => (
              <div
                key={index}
                className={`flex flex-col items-center ${getNeedleColor(
                  index
                )} rounded-lg`}
              >
                <div className="w-2/6 aspect-square flex flex-col items-center justify-center mb-2">
                  <img
                    src="/images/needle.gif"
                    alt={`Needle ${index + 1}`}
                    className="w-48"
                  />
                  <span className="text-2xl font-bold text-gray-800">
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm text-black font-semibold mb-4">
                  {index === sequenceNeedleIndex
                    ? "Sequence"
                    : needles[index].type === "Thread"
                    ? "Thread"
                    : "Not Set"}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Needle Configuration Cards */}
      <div className="grid grid-cols-6 gap-4 p-4">
        {needles.map((needle, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md shadow-gray-300 p-6 flex flex-col justify-between"
          >
            <div>
              <h4 className="text-lg font-semibold mb-4">Needle {index + 1}</h4>
              <div className="flex flex-col gap-5">
                {/* Only show thread settings if this is not the selected sequence needle */}
                {sequenceNeedleIndex !== index && (
                  <>
                    <div className="flex flex-col items-start">
                      <label className="block text-sm font-medium text-gray-700">
                        Thread Company
                      </label>
                      <Select
                        options={companyOptions}
                        value={companyOptions.find(option => option.value === needle.threadCompany)}
                        onChange={(selectedOption) =>
                          handleCompanyChange(selectedOption, index)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="flex flex-col items-start">
                      <label className="block text-sm font-medium text-gray-700">
                        Thread Color
                      </label>
                      <Select 
                        options={needle.threadColorOptions.map((dhaga) => ({
                          value: dhaga.code,
                          label: dhaga.name,
                        }))}
                        value={needle.threadColorOptions
                          .map((dhaga) => ({
                            value: dhaga.code,
                            label: dhaga.name,
                          }))
                          .find(option => option.value === needle.threadColor)}
                        onChange={(selectedOption) =>
                          updateNeedleConfig(
                            index,
                            "threadColor",
                            selectedOption.value
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {/* New Dropdowns for A, B, C, D, E, F */}
                {sequenceNeedleIndex === index && (
                  <div className="flex flex-col gap-3">
                    {["A", "B", "C", "D", "E", "F"].map((label) => (
                      <div
                        key={label}
                        className="flex flex-row items-center gap-2"
                      >
                        <label className="block text-sm font-medium text-gray-700">
                          {label}
                        </label>
                        {/* Material Dropdown */}
                        <select
                          className="mt-1 block w-full p-2 border rounded-button border-gray-300"
                          value={selectedOptions[index][label][0]} // Material selection
                          onChange={(e) => {
                            const newOptions = [...selectedOptions];
                            newOptions[index][label][0] = e.target.value;
                            setSelectedOptions(newOptions);
                          }}
                        >
                          <option value="">Select Material</option>
                          {materials.map((material) => (
                            <option key={material.code} value={material.code}>
                              {material.name}
                            </option>
                          ))}
                        </select>
                        {/* Size Dropdown */}
                        <select
                          className="mt-1 block w-full p-2 border rounded-button border-gray-300"
                          value={selectedOptions[index][label][1]} // Size selection
                          onChange={(e) => {
                            const newOptions = [...selectedOptions];
                            newOptions[index][label][1] = e.target.value;
                            setSelectedOptions(newOptions);
                          }}
                        >
                          <option value="">Select Size</option>
                          {sizes.map((size) => (
                            <option key={size.code} value={size.name}>
                              {size.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NeedleConfigPanel;
